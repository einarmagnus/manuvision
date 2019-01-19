# ManuVision calendar fix

I found it frustrating that the calendar events are published to everyone and that I can't make an exported calendar with only events for my class.

![](cal.gif?raw=true)

I understand why it is like that (so that older students can attend our classes) and so I decided to make a fix.

To subscribe to all events for hold 16 I'd have to go through all calendar items related to hold 16 and click subscribe on them. I am not a big fan of clicking things so I made a script that does it for me. I wrote it to be general enough that anyone on any class can use it.

![](script.gif?raw=true)

## Instructions:

For this to work you may have to use a recent edition of Firefox or Chrome. I have not tested it in Safari or Edge. It will definetely not work in Internet Explorer.

Go to https://gist.github.com/einarmagnus/c2de6abc3e04e2033b080d06857bf99a and copy the code.

Open podio and log in.

Click anywhere in the website and choose "Inspect" or "Inspect Element" or something similar in your language.

In the new window section that appears you should select the tab "Console" and then paste the code there and press the return key (also called Enter).

Then just enter the number of your class and the script should do the rest.