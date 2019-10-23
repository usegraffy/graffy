import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import Navigation from '../components/navigation';

class GraffyDocApp extends App {
  static async getInitialProps(appContext) {
    const appProps = await App.getInitialProps(appContext);
    const navProps = await Navigation.getInitialProps();
    return { ...appProps, navProps };
  }

  render() {
    const {
      Component,
      pageProps: { navProps, ...pageProps },
    } = this.props;

    return (
      <div className="App">
        <Head>
          <title>Graffy</title>
        </Head>
        <header>
          Graffy
          <Navigation {...navProps} />
        </header>
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
