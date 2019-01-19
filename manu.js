"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
let csrfToken;
function csrf() {
    return __awaiter(this, void 0, void 0, function* () {
        if (csrfToken === undefined) {
            const mainPage = yield (yield fetch("/")).text();
            const csrf = /csrfToken&quot;:&quot;([^&]+)/.exec(mainPage);
            if (csrf === null) {
                throw new Error("Could not extract csrf-token");
            }
            csrfToken = csrf[1];
        }
        return csrfToken;
    });
}
function fetchJson(url, method) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                "X-CSRF-Token": yield csrf()
            }
        })).json();
    });
}
function subscribe() {
    return __awaiter(this, void 0, void 0, function* () {
        return fetchJson(`https://podio.com/_json/subscriptions/item/${this.id}/subscribe.json`, "POST");
    });
}
function unsubscribe() {
    return __awaiter(this, void 0, void 0, function* () {
        return fetchJson(`https://podio.com/_json/subscriptions/item/${this.id}/unsubscribe.json`, "DELETE");
    });
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
function getAllItems(options, found = []) {
    return __awaiter(this, void 0, void 0, function* () {
        const defaults = {
            chunkSize: 200
        };
        options = Object.assign(defaults, options);
        const result = yield fetch(`https://podio.com/_json/items/app/707160/get.json`, {
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
                "X-CSRF-Token": yield csrf()
            },
            credentials: "include",
        });
        const data = (yield result.json()).data;
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
            return yield getAllItems(options, found);
        }
    });
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
function main(action = Action.subscribe) {
    return __awaiter(this, void 0, void 0, function* () {
        const hold = prompt("Please enter the number of your 'hold':");
        if (hold === null) {
            return;
        }
        if (/^\s*(\d+)\s*$/.test(hold)) {
            console.log("Retrieving all items created in the last 3 years...");
            const items = yield getAllItems();
            try {
                let subscribeTo = filterForHold(items, +hold).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
                console.log("Found " + subscribeTo.length + " items:");
                for (let item of subscribeTo)
                    console.log("  " + item.toString());
                if (confirm(`Found ${subscribeTo.length} items listed in console, do you wish to ${Action[action]} them all?`)) {
                    let result = yield Promise.all(subscribeTo.map(item => action == Action.subscribe
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
    });
}
