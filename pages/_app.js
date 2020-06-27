/* global __navMenu */

import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import Router from 'next/router';
import { Navigation } from '@graffy/website';

class GraffyDocApp extends App {
  constructor() {
    super();
    Router.onRouteChangeStart = () => this.setState({ expanded: false });
  }
  state = { expanded: false };
  toggleExpanded = () => this.setState(({ expanded: e }) => ({ expanded: !e }));

  render() {
    const { Component, pageProps } = this.props;
    const { expanded } = this.state;
    const headerProps = { ...(expanded ? { 'data-expanded': true } : {}) };
    return (
      <div className="App">
        <Head>
          <title>Graffy</title>
        </Head>
        <header {...headerProps}>
          <div className="logo">
            <img alt="Graffy Logo" src="/graffy-logo.svg" />
            <a className="menuButton" onClick={this.toggleExpanded}>
              ☰
            </a>
          </div>
          <nav>
            <Navigation menu={__navMenu} />
          </nav>
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
            position: sticky;
            background: #eee;
            top: 0;
            bottom: 0;
          }
          nav {
            background: #eee;
            color: #555;
            padding: 2rem 4rem 4rem 4rem;
          }
          .logo {
            background: #f36;
            height: 8rem;
            display: flex;
            padding: 1rem;
            justify-content: space-around;
          }
          .logo img {
            height: auto;
            max-width: 100%;
            max-height: 100%;
            box-shadow: none;
            transition: 0.2s all cubic-bezier(0.175, 0.885, 0.5, 1.5);
          }
          .logo:hover img,
          header[data-expanded] .logo img {
            transform: rotate(12deg);
          }
          a.menuButton {
            display: none;
            height: 4rem;
            width: 4rem;
            line-height: 4rem;
            font-size: 1rem;
            text-align: center;
            color: #000;
            text-decoration: none;
            cursor: pointer;
          }
          a.menuButton:hover,
          header[data-expanded] a.menuButton {
            color: #fff;
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
              position: relative;
              min-height: 4rem;
              max-height: 4rem;
              width: 100%;
              perspective: 50rem;
              perspective-origin: bottom;
              z-index: 1;
            }
            nav {
              transform: rotate3D(1, 0, 0, -90deg);
              transform-origin: top;
              opacity: 0;
              transition: 0.2s all ease-in;
            }
            header[data-expanded] nav {
              opacity: 1;
              transform: rotate3D(1, 0, 0, 0deg);
              transition: 0.2s transform cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .logo {
              height: 4rem;
              padding: 0 0 0 4rem;
              justify-content: space-between;
            }
            a.menuButton {
              display: block;
            }
            main {
              padding-top: 1rem;
              align-self: stretch;
            }
          }
        `}</style>
      </div>
    );
  }
}

export default GraffyDocApp;
