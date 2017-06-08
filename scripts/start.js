'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

const fs = require('fs');
const chalk = require('chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const clearConsole = require('react-dev-utils/clearConsole');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const {
  choosePort,
  createCompiler,
  prepareProxy,
  prepareUrls,
} = require('react-dev-utils/WebpackDevServerUtils');
const openBrowser = require('react-dev-utils/openBrowser');
const paths = require('../config/paths');

// const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
//if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
if (!checkRequiredFiles([paths.appIndexJs])) {
  process.exit(1);
}

// Tools like Cloud9 rely on this.
const DEFAULT_CLIENT_PORT = parseInt(process.env.PORT, 10) || 3020;
const DEFAULT_SERVER_PORT = parseInt(process.env.PORT, 10) || 5678;
const HOST = process.env.HOST || '0.0.0.0';

// We attempt to use the default port but if it is busy, we offer the user to
// run on a different port. `detect()` Promise resolves to the next free port.
choosePort(HOST, DEFAULT_CLIENT_PORT)
  .then(port => {
    if (port == null) {
      // We have not found a port.
      return;
    }

    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    const appName = require(paths.appPackageJson).name;
    const urls = prepareUrls(protocol, HOST, port);

    // We do this before importing the wepack.config.client.dev otherwise
    // REACT_APP_CLIENT_PORT won't be set at new webpack.DefinePlugin(env.stringified)
    process.env.REACT_APP_CLIENT_PORT = port
    const configWebpackClient = require('../config/webpack.config.client.dev');

    // Create a webpack compiler that is configured with custom messages.
    // we use different compiler
    //const compiler = createCompiler(webpack, configWebpackClient, appName, urls, useYarn);
    const compiler = webpack(configWebpackClient);

    // Load proxy config
    const proxySetting = require(paths.appPackageJson).proxy;
    const proxyConfig = prepareProxy(proxySetting, paths.appPublic);
    const createDevServerConfig = require('../config/webpackDevServer.config');
    // Serve webpack assets generated by the compiler over a web sever.
    const serverConfig = createDevServerConfig(
      proxyConfig,
      urls.lanUrlForConfig
    );

    const clientServer = new WebpackDevServer(compiler, serverConfig);

    // Launch WebpackDevServer.
    clientServer.listen(port, HOST, err => {
      if (err) {
        return console.log(err);
      }
      if (isInteractive) {
        // clearConsole();
      }
      console.log(chalk.cyan(`Starting the client on port ${port}...\n`));

      choosePort(HOST, DEFAULT_SERVER_PORT)
        .then(portServer => {
          if (portServer == null) {
            // We have not found a port.
            return;
          }

          process.env.REACT_APP_SERVER_PORT = portServer;
          const configWebpackServer = require('../config/webpack.config.server');
          const compiler = webpack(configWebpackServer);
          const urls = prepareUrls(protocol, HOST, portServer);
          let browserOpened;

          compiler.watch({ // watch options:
              aggregateTimeout: 300, // wait so long for more changes
          }, function(err, stats) {
              if (err)
                console.log('error on webpack server', err);

              const server = require('../build/server/bundle.js');
              if (!browserOpened) {
                browserOpened = true
                openBrowser(urls.localUrlForBrowser);
              }
          });
        })
        .catch(err => {
          if (err && err.message) {
            console.log(err.message);
          }
          process.exit(1);
        });
    });
    ['SIGINT', 'SIGTERM'].forEach(function(sig) {
      process.on(sig, function() {
        clientServer.close();
        process.exit();
      })
    });
  })
  .catch(err => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });