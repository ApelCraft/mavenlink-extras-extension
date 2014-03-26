# MavenLink Extras Chrome Extension

Maintainer: [FellSwoop](https://github.com/fellswoop) 

Scaffolding Generated by: https://github.com/yeoman/generator-chrome-extension

## Getting Started

- Install the required packages via node: `npm install`

- The primary files are contentscript.js and main.css. Both are run at DomReady on any url that contains 'app.mavenlink.com' and have full acess to the underlying page's DOM. The initial action is to append a 'Resource Allocation' link into the left nav.

- More info on [Google Chrome Extension Develpment](http://developer.chrome.com/extensions/devguide.html)

## Build & Package

Run `grunt build` to build your Chrome Extension project. The resultant minified/concatenated zipped file will be in the 'package' directory. 

Upload this file to the [Chrome Developer Dashboard](http://developer.chrome.com/extensions/packaging) and into the Chrome Web Store. 

## License

[BSD license](http://opensource.org/licenses/bsd-license.php)