import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import { Navigation } from '@graffy/website';

class GraffyDocApp extends App {
  static async getInitialProps(appContext) {
    const appProps = await App.getInitialProps(appContext);
    const navProps = await Navigation.getInitialProps();
    return { ...appProps, navProps };
  }

  render() {
    const { Component, pageProps, navProps } = this.props;

    return (
      <div className="App">
        <Head>
          <title>Graffy</title>
        </Head>
        <header>
          <img alt="Graffy Logo" src="/graffy-logo.svg" />
          <Navigation {...navProps} />
        </header>
        <main>
          <Component {...pageProps} />
        </main>
        <style jsx>{`
          .App {
            display: flex;
            min-height: 1vh;
          }
          header {
            flex: 0 0 auto;
            width: 20rem;
            padding: 4rem;
            position: sticky;
            top: 0;
            bottom: 0;
            background: #eee;
            color: #555;
          }
          main {
            flex: 1 1 0;
            padding: 4rem;
            max-width: 40rem;
          }
          @media screen and (max-width: 60rem) {
            .App {
              flex-direction: column;
            }
            header {
              max-height: 2rem;
              overflow: hidden;
            }
            header:focus-within {
              max-height: 100rem;
              overflow: auto;
            }
          }
        `}</style>
      </div>
    );
  }
}

export default GraffyDocApp;
