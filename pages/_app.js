import React from 'react';
import App from 'next/app';
import Head from 'next/head';

class GraffyDocApp extends App {
  // Only uncomment this method if you have blocking data requirements for
  // every single page in your application. This disables the ability to
  // perform automatic static optimization, causing every page in your app to
  // be server-side rendered.
  //
  // static async getInitialProps(appContext) {
  //   // calls page's `getInitialProps` and fills `appProps.pageProps`
  //   const appProps = await App.getInitialProps(appContext);
  //
  //   return { ...appProps }
  // }

  render() {
    const { Component, pageProps } = this.props;
    console.log('pageProps', pageProps);

    return (
      <div className="App">
        <Head>
          <title>Graffy</title>
        </Head>
        <header>Graffy</header>
        <main>
          <Component {...pageProps} />
        </main>
        <style jsx>{`
          .App {
            display: flex;
          }
          header,
          main {
            flex: 1 1 0;
          }
        `}</style>
      </div>
    );
  }
}

export default GraffyDocApp;
