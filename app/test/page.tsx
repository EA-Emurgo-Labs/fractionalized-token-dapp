'use client';
import Link from "next/link";
import Head from "next/head";
import Script from "next/script";

let handleOnLoad = () =>
console.log(`script loaded correctly, window.FB has been populated`)

export default function test() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Head>
        <title>First Post</title>
      </Head>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={handleOnLoad}
      />
      <h1>First Post</h1>
      <h2>
        <Link href="/">Back to home</Link>
      </h2>
    </main>
  );
}