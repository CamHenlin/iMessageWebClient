# iMessage web client

![iMessage web client screenshot](https://github.com/CamHenlin/imessagewebclient/raw/master/screenshot.png "screenshot of the iMessage web client in action")

## What it is
iMessage web is a web interface for iMessages, enabled by running a small node app and collection of AppleScripts on a server signed into your iMessages account with Messages.app. Supersedes [iMessageService](https://github.com/CamHenlin/iMessageService)

## Use cases
- Try out a non-iPhone and keep iMessages turned on for some reason
- Be signed in to 2 or more iMessages accounts at once on one iOS/Mac devices
- send iMessages from your Windows computer at work from your Mac at home more easily than [this other project](https://github.com/CamHenlin/imessageclient/)

## Security concerns
Of course, access to your iMessages means that security is a concern, especially for something web-based. I decided that the best solution to address this was firstly to have the user create a "key" during the postinstall step that they must use to login to the web app on their devices. Secondly, designed the server to generate a self-signed SSL certificate when the app is first run. Of course, the certificate will be invalid and generate warnings for most clients, but at least it will enable encryption. More advanced users can drop legitimate SSL certificates in place if desired.

## requirements:
- server running OS X 10.7 or better
- nodejs
- Apple iMessages account signed in to Messages.app

## How to run on your Mac:
```bash
git clone https://github.com/CamHenlin/imessagewebclient.git

cd imessagewebclient

npm install

sudo npm start

node app
```
`note: if you prefer to start the app without sudo, start it instead with the command: PORT=YOUR_PORT npm start, and adjust your web browser accordingly`

## How to use:
- navigate your favorite web browser to https://localhost/
- enter the key you set during the installation

I also recommend setting up some kind of dns service, such as No IP, that you can use to access your computer remotely.

## This is clunky!
Yeah I will probably improve it over the next few days.

## Shortcomings
No push notifications! You can kind of get around this by using this: [AutoForwardIMessage](https://github.com/yongjunj/AutoForwardIMessage) to a different message app such as gchat, which you can sign into on your phone to get push notifications. In the future I would like to move this to a packaged cordova app for major app stores and provide a central push notification service for users.

## Why did you make this?
I would like to draw attention to another project: [nodeprivatemessageskit](https://github.com/CamHenlin/nodeprivatemessageskit) Where I am trying to use private MessagesKit frameworks to send messages rather than rely on AppleScripts. I'm in a little over my head there and I would really like some pointers or assistance from people with more experience using private frameworks as I believe it could lead to more reliable and interesting uses for iMessages in the future.
