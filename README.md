# Play Your Caps Right

Higher or lower, with England men's footballers. You see a player and his England caps. Guess whether the next player has more or fewer. One wrong call and you're out.

Play it at **https://pdobson1.github.io/play-your-caps-right/**

## How the caps stay up to date

`data/players.json` holds the deck. A GitHub Action (`.github/workflows/site.yml`) runs every Wednesday and Sunday morning, and on demand from the Actions tab. It:

1. Runs the parser tests.
2. Reads each player's Wikipedia article and takes the England senior caps from its infobox (`scripts/update-caps.mjs`).
3. Adds anyone in the current England squad who isn't in the deck yet. New players get a plain silhouette until someone gives them a `look`.
4. Stamps today's date as `updated` (shown on the site as "Data accurate as of …") and commits the file. GitHub Pages builds from `main`, so the commit redeploys the site.

If more than half the players can't be read, the run fails and nothing changes. The log lists any player whose page couldn't be read, usually because the `wiki` title points at a disambiguation page.

## Player looks

Portraits are drawn in code from a few traits in each player's `look`:

| Field | Values |
| --- | --- |
| `skin` | `0`–`4`, lightest to darkest |
| `hair` | `b` blond, `l` light brown, `m` brown, `d` dark brown, `k` black, `g` ginger, `s` grey |
| `style` | `short`, `buzz`, `bald`, `receding`, `combover`, `long`, `mullet`, `curly`, `afro`, `quiff`, `mohawk`, `ponytail`, `curtains`, `bowl` |
| `facial` | `moustache`, `beard`, `stubble` (optional) |
| `extra` | `bandage`, `gap` (optional) |

`era` picks the kit: red for the 1960s, Admiral stripes for the 1970s, and so on.

## Running locally

```sh
npm test                 # parser tests
npm run update-caps      # refresh data/players.json from Wikipedia
npm run serve            # then open http://localhost:8000
```

Caps figures come from Wikipedia, used under CC BY-SA 4.0. The music is an original tune.
