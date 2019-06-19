# iMessage Web Client

![iMessage web client screenshot](https://github.com/CamHenlin/imessagewebclient/raw/master/screenshot.png "screenshot of the iMessage web client in action")

## What is this?
iMessage Web Client is a web interface for iMessages, enabled by running a small nodejs app (which itself is based on [imessageclient](https://github.com/CamHenlin/imessageclient)) and collection of AppleScripts on a server signed into your iMessages account with Messages.app. Supersedes [iMessageService](https://github.com/CamHenlin/iMessageService)

## Use cases
- Try out a non-iPhone and keep iMessages turned on for some reason
- Be signed in to 2 or more iMessages accounts at once on one iOS/Mac devices
- Send iMessages from your Windows computer at work from your Mac at home more easily than [this other project](https://github.com/CamHenlin/imessageclient/)
- You tell me

## Security concerns
Of course, access to your iMessages means that security is a concern, especially for something web-based. I decided that the best solution to address this was firstly to have the user create a "key" during the installation step that they must use to login to the web app on their devices this key can be reset by running "npm run postinstall". Secondly, the server also generates a self-signed SSL certificate when the app is first installed. Of course, the certificate will be invalid and generate warnings for most clients, but at least it will enable encryption so others on your network will not be able to read your conversations. More advanced users can drop legitimate SSL certificates in place if desired.

## requirements:
- server running OS X 10.7 or better
- nodejs
- Apple iMessages account signed in to Messages.app

## How to get the server running on your Mac:
```bash
git clone https://github.com/CamHenlin/imessagewebclient.git

cd imessagewebclient

npm install

sudo npm start
```
`note: if you prefer to start the app without sudo, start it instead with the command: PORT=YOUR_PORT npm start, and adjust your web browser accordingly`

## How to access on some other device:
- navigate your favorite web browser to https://localhost/ (or whatever forwarding service you have pointed to your computer, or its IP address!)
- enter the key you set during the installation
- use the app as if it were the Messages app on an iPhone

Note if you are using this on a mobile device, it is mobile web app capable.

## This is clunky!
Yeah I will probably improve it over the next few days.

## Shortcomings
No push notifications! You can kind of get around this by using this: [AutoForwardIMessage](https://github.com/yongjunj/AutoForwardIMessage) to a different message app such as gchat, which you can sign into on your phone to get push notifications. In the future I would like to move this to a packaged cordova app for major app stores and provide a central push notification service for users. Users should let me know if they're interested in a service like this.

## Why did you make this?
I would like to draw attention to another project: [nodeprivatemessageskit](https://github.com/CamHenlin/nodeprivatemessageskit) Where I am trying to use private MessagesKit frameworks to send messages rather than rely on AppleScripts. I'm in a little over my head there and I would really like some pointers or assistance from people with more experience using private frameworks as I believe it could lead to more reliable and interesting uses for iMessages in the future.

Uses [iMessageModule](https://github.com/CamHenlin/iMessageModule).

![made with a mac](http://henlin.org/mac.gif "made with a mac")
