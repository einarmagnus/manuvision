"use strict";
let csrfToken;
async function csrf() {
    if (csrfToken === undefined) {
        const mainPage = await (await fetch("/")).text();
        const csrf = /csrfToken&quot;:&quot;([^&]+)/.exec(mainPage);
        if (csrf === null) {
            throw new Error("Could not extract csrf-token");
        }
        csrfToken = csrf[1];
    }
    return csrfToken;
}
async function fetchJson(url, method) {
    return (await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            "X-CSRF-Token": await csrf()
        }
    })).json();
}
async function subscribe() {
    return fetchJson(`https://podio.com/_json/subscriptions/item/${this.id}/subscribe.json`, "POST");
}
async function unsubscribe() {
    return fetchJson(`https://podio.com/_json/subscriptions/item/${this.id}/unsubscribe.json`, "DELETE");
}
function parsedItemToString() {
    let { start, end } = this;
    const pad = (val) => val.toString().padStart(2, "0");
    const date = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    let startDate = date(start);
    let endDate = date(end);
    if (startDate === endDate) {
        return `${startDate} ${time(start)} -> ${time(end)} :: ${this.title}`;
    }
    else {
        return `${startDate} ${time(start)} -> ${endDate} ${time(end)} :: ${this.title}`;
    }
}
function parseItem(item) {
    const title = item.title;
    const id = item.item_id;
    let date = item.fields.find((el) => el.type == "date");
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
async function getAllItems(options, found = []) {
    const defaults = {
        chunkSize: 200
    };
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
    const parsed = items.map(parseItem);
    found = found.concat(parsed);
    const lastItem = parsed[parsed.length - 1];
    console.log(`Getting items... ${found.length}/${length})`);
    if (items.length < options.chunkSize || lastItem.created < threeYearsAgo) {
        console.log(`Done searching! Last item was created on ${lastItem.created})`);
        return found;
    }
    else {
        return await getAllItems(options, found);
    }
}
function escapeRegExp(str) {
    return new RegExp(str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
}
function filterForHold(items, hold) {
    const pattern = new RegExp(`hold (,|\\d|og|\\s)*${hold}`, "i");
    return items.filter(item => pattern.test(item.title));
}
var Action;
(function (Action) {
    Action[Action["subscribe"] = 0] = "subscribe";
    Action[Action["unsubscribe"] = 1] = "unsubscribe";
})(Action || (Action = {}));
async function main(action = Action.subscribe) {
    if (location.host !== "podio.com") {
        alert("This only works on Podio, you need to bookmark it to use it");
        return;
    }
    const hold = prompt("Please enter the number of your 'hold':");
    if (hold === null) {
        return;
    }
    if (/^\s*(\d+)\s*$/.test(hold)) {
        const itemsPromise = getAllItems();
        alert("Retrieving all items created in the last 3 years. It may take some time...");
        const items = await itemsPromise;
        try {
            let subscribeTo = filterForHold(items, +hold).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
            let foundItemsString = "";
            for (let item of subscribeTo)
                foundItemsString += " ∙" + item.toString() + "\n";
            if (confirm(`Found ${subscribeTo.length} items listed below, do you wish to ${Action[action]} them all?\n` + foundItemsString)) {
                let result = await Promise.all(subscribeTo.map(item => action == Action.subscribe
                    ? item.subscribe()
                    : item.unsubscribe()));
                console.log(Action[action] + "d to all:");
                for (let i = 0; i < subscribeTo.length; i++) {
                    let item = subscribeTo[i];
                    let r = result[i];
                    if (r.status === "ok") {
                        console.log(`✅ ok ${item.toString()}`);
                    }
                    else {
                        console.error(`⚠️ ${r.status} (${item.toString()})`, r, item);
                    }
                }
                alert(`You were ${Action[action]}d to ${subscribeTo.length} items referencing hold ${hold}:`);
            }
        }
        catch (e) {
            alert("Something went wrong with some subscription :( ");
            console.error(e);
        }
    }
    else {
        if (confirm("'" + hold + "' is not a number, do you want to try again?")) {
            setTimeout(() => main(action), 0);
        }
    }
}
main();
