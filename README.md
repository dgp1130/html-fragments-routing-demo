# HTML Fragments Routing Demo

Demo using HTML fragments to provide SSR'd routing applied client-side.

Check out the [running application](https://html-fragments-routing-demo.dwac.dev/).

Note: Streaming routes don't work on Firefox ([bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1811782))

## Deployments

```shell
npm run build
npm run netlify -- deploy -s "${SITE_ID}" --prod -m "Manual deployment from command line."
```
