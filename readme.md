# MavenLink Extras Chrome Extension

## About
A Google Chrome Extension that adds a 12-week, cross-team resource allocation view to the Mavenlink project management web app.  

Maintainer: [FellSwoop](https://github.com/fellswoop)  

Published extension at: [https://chrome.google.com/webstore/detail/mavenlink-extras/gmmfphcjcphfkjgbibpjpdhehgblpfco]( https://chrome.google.com/webstore/detail/mavenlink-extras/gmmfphcjcphfkjgbibpjpdhehgblpfco)

Scaffolding Generated by: https://github.com/yeoman/generator-chrome-extension

## Development

- Install the required packages via node: `npm install`

- The primary files are contentscript.js and main.css. Both are run at DomReady on any url that contains 'app.mavenlink.com'. They have full acess to the underlying page's DOM. The initial action is to append a 'Resource Allocation' link into the left nav.

- To load the extension open [chrome:extensions](chrome:extensions) and select 'load unpacked extension'. Choose the app directory.

- Whenever changes are made you'll need to 'reload' the unpacked extension. This is a hassle and should somehow be automated.

- More info on [Google Chrome Extension Develpment](http://developer.chrome.com/extensions/devguide.html)

## Build & Package

Run `grunt build` to build your Chrome Extension project. The resultant minified/concatenated zipped file will be in the 'package' directory. 

Upload this file to the [Chrome Developer Dashboard](http://developer.chrome.com/extensions/packaging) and into the Chrome Web Store. 

## License

[BSD license](http://opensource.org/licenses/bsd-license.php)
