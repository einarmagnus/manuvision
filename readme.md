# ManuVision calendar fix

I found it frustrating that the calendar events are published to everyone and that I can't make an exported calendar with only events for my class.

I understand why it is like that (so that older students can attend our classes) and so I decided to make a fix.

To subscribe to all events for hold 16 I'd have to go through all calendar items related to hold 16 and click subscribe on them. I am not a big fan of clicking things so I made a script that does it for me. I wrote it to be general enough that anyone on any class can use it.

## Instructions:

For this to work you may have to use a recent edition of Firefox or Chrome. I have not tested it in Safari or Edge. It will definetely not work in Internet Explorer.

The simplest way if you use Firefox is to right-click on this link: <a href='javascript:(function() {if (window.location.host !== "podio.com"){alert("This link should be bookmarked and then run on Podio")} else {if (typeof(main) !== "undefined") { main(); return };let s = document.createElement("script");s.src="https://cdn.jsdelivr.net/gh/einarmagnus/manuvision/manuvision.js";document.head.appendChild(s);}})();'>ManuVision -- subscribe to hold</a> and choose to bookmark it.
If it is not a link, please access this page through this url instead: https://einarmagnus.github.io/manuvision/

Then, when you're on the podio web site, you click on your bookmark and the script will be run.

If you don't want to use a bookmark, or you are using chrome, there is another way:

copy this code:

```javascript
document.createElement("script");
s.src="https://cdn.jsdelivr.net/gh/einarmagnus/manuvision/manuvision.js";
document.head.appendChild(s);
```

Open podio and log in.

Click anywhere in the website and choose "Inspect" or "Inspect Element" or something similar in your language.

In the new window section that appears you should select the tab "Console" and then paste the code there and press the return key (also called Enter).

Then just enter the number of your class and the script should do the rest.