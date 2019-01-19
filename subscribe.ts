
let csrfToken : string;
async function csrf() {
    if (csrfToken === undefined) {
        const mainPage = await (await fetch("/")).text();
        const csrf = /csrfToken&quot;:&quot;([^&]+)/.exec(mainPage)
        if (csrf === null) {
            throw new Error("Could not extract csrf-token");
        }
        csrfToken = csrf[1];
    }
    return csrfToken;
}

type HttpVerb = "GET" | "POST" | "DELETE" | "PUT";
async function fetchJson(url : string, method : HttpVerb) {
    return (await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            "X-CSRF-Token": await csrf()
        }
    })).json();
}

async function subscribe(this: {id: number}) {
    return fetchJson(`https://podio.com/_json/subscriptions/item/${this.id}/subscribe.json`, "POST");
}
async function unsubscribe(this: {id: number}) {
    return fetchJson(`https://podio.com/_json/subscriptions/item/${this.id}/unsubscribe.json`, "DELETE");
}

interface ParsedItem {
    title: string,
    id: number,
    start: Date,
    end: Date
    created: Date,
    subscribe: () => Promise<any>,
    unsubscribe: () => Promise<any>,
    unparsed: any,
    toString: () => string
}

function parsedItemToString(this: ParsedItem) {
    let {start, end} = this;
    const pad = (val: number) => val.toString().padStart(2, "0");
    const date = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    let startDate = date(start);
    let endDate = date(end);
    if (startDate === endDate) {
        return `${startDate} ${time(start)} -> ${time(end)} :: ${this.title}`;
    } else {
        return `${startDate} ${time(start)} -> ${endDate} ${time(end)} :: ${this.title}`;
    }

}

function parseItem(item : any) : ParsedItem {
    const title = item.title;
    const id = item.item_id;
    let date = item.fields.find((el : any) => el.type == "date");
    let start = new Date(date.start_utc);
    let end = new Date(date.end_utc);
    const created = new Date(item.created_on);
    return {
        title,
        id,
        start,
        end,
        created,
        subscribe,
        unsubscribe,
        unparsed: item,
        toString: parsedItemToString
    };
}

const now = new Date();
const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDay());

interface getAllItemsOptions {
    chunkSize: number,
}

async function getAllItems(options?: getAllItemsOptions, found: Array<ParsedItem> = []): Promise<Array<ParsedItem>> {

    const defaults: getAllItemsOptions = {
        chunkSize: 200
    }

    options = Object.assign(defaults, options);

    const result = await fetch(`https://podio.com/_json/items/app/707160/get.json`, {
        method: "POST",
        body: JSON.stringify({
            filter_values: {
                sort_by: "created_on",
                sort_desc: true
            },
            limit: options.chunkSize,
            offset: found.length,
        }),
        headers: {
            'Content-Type': 'application/json',
            "X-CSRF-Token": await csrf()
        },
        credentials: "include",

    });
    const data = (await result.json()).data;
    const items = data.object;
    const length = data.meta.count;

    const parsed: Array<ParsedItem> = items.map(parseItem);
    found = found.concat(parsed);
    const lastItem = parsed[parsed.length - 1];

    console.log(`Getting items... ${found.length}/${length})`);

    if (items.length < options.chunkSize || lastItem.created < threeYearsAgo) {
        console.log(`Done searching! Last item was created on ${lastItem.created})`);
        return found;
    } else {
        return await getAllItems(options, found);
    }
}

function escapeRegExp(str: string): RegExp {
    return new RegExp(str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
}

function filterForHold(items: Array<ParsedItem>, hold: number) : Array<ParsedItem> {
    const pattern = new RegExp(`hold (,|\\d|og|\\s)*${hold}`, "i");
    return items.filter(item => pattern.test(item.title));
}

enum Action{
    subscribe, unsubscribe
}

async function main(action: Action = Action.subscribe) {
    const hold = prompt("Please enter the number of your 'hold':");
    if (hold === null) {
        return;
    }
    if (/^\s*(\d+)\s*$/.test(hold)) {
        console.log("Retrieving all items created in the last 3 years...");
        const items = await getAllItems();
        try {
            let subscribeTo = filterForHold(items, +hold).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
            console.log("Found " + subscribeTo.length + " items:");
            for (let item of subscribeTo)
                console.log("  " + item.toString());
            if (confirm(`Found ${subscribeTo.length} items listed in console, do you wish to ${Action[action]} them all?`)) {
                let result = await Promise.all(subscribeTo.map(item =>
                    action == Action.subscribe
                        ? item.subscribe()
                        : item.unsubscribe()
                ));
                console.log(Action[action] + "d to all:")
                for (let i = 0; i < subscribeTo.length; i++) {
                    let item = subscribeTo[i];
                    let r = result[i];
                    if (r.status === "ok") {
                        console.log(`✅ ok ${item.toString()}`);
                    } else {
                        console.error(`⚠️ ${r.status} (${item.toString()})`, r, item)
                    }
                }
                alert(`You were ${Action[action]}d to ${subscribeTo.length} items referencing hold ${hold}:`);
            }
        } catch (e) {
            alert("Something went wrong with some subscription :( ");
            console.error(e);
        }
    } else {
        if (confirm("'" + hold + "' is not a number, do you want to try again?")) {
            setTimeout(() => main(action), 0);
        }
    }
}