/* global __navMenu */

import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { Navigation } from '@graffy/website';

class GraffyDocApp extends App {
  render() {
    const { Component, pageProps } = this.props;

    return (
      <div className="App">
        <Head>
          <title>Graffy</title>
        </Head>
        <header>
          <div className="logo">
            <Link href="/">
              <a>
                <img alt="Graffy Logo" src="/graffy-logo.svg" />
              </a>
            </Link>
          </div>
          <Navigation menu={__navMenu} />
        </header>
        <main>
          <Component {...pageProps} />
        </main>
        <style jsx>{`
          .App {
            display: flex;
            align-items: flex-start;
            min-height: 100vh;
          }
          header {
            flex: 0 0 auto;
            width: 18rem;
            min-height: 100vh;
            padding: 4rem;
            position: sticky;
            top: 0;
            bottom: 0;
            background: #eee;
            color: #555;
          }
          .logo {
            margin: -4rem -4rem 2rem -4rem;
            background: #f36;
            text-align: center;
            height: 8rem;
            display: flex;
          }
          .logo a,
          .logo img {
            display: flex;
            flex: 1;
            height: auto;
            max-width: 100%;
            max-height: 100%;
            box-shadow: none;
          }
          main {
            flex: 1 1 0;
            padding: 4rem;
            max-width: 55rem;
          }
          @media screen and (max-width: 60rem) {
            .App {
              flex-direction: column;
            }
            header {
              max-height: 2rem;
              width: 100vw;
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
