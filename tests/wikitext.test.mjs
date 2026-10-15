import { test } from "node:test";
import assert from "node:assert/strict";
import { englandCaps, currentSquad, clean, candidateTitles } from "../scripts/wikitext.mjs";

const KANE = `{{Short description|English footballer (born 1993)}}
{{Infobox football biography
| name = Harry Kane
| image = Harry Kane 2024.jpg
| birth_date = {{birth date and age|1993|7|28|df=y}}
| position = [[Forward (association football)|Striker]]
| currentclub = [[FC Bayern Munich|Bayern Munich]]
| nationalyears1 = 2010
| nationalteam1 = [[England national under-17 football team|England U17]]
| nationalcaps1 = 3
| nationalgoals1 = 1
| nationalyears4 = 2015–
| nationalteam4 = [[England national football team|England]]
| nationalcaps4 = 112<ref>{{cite web|url=https://example.com|title=Caps}}</ref>
| nationalgoals4 = 78
| club-update = 17:20, 1 November 2025 (UTC)
| nationalteam-update = 21:45, 16 November 2025 (UTC)
}}
'''Harry Edward Kane''' is an English professional footballer...`;

test("reads England senior caps and skips youth teams", () => {
  assert.deepEqual(englandCaps(KANE), { caps: 112, years: "2015–", asOf: "21:45, 16 November 2025 (UTC)" });
});

test("handles players who also played for another country", () => {
  const rice = `{{Infobox football biography
| nationalteam1 = [[Republic of Ireland national football team|Republic of Ireland]]
| nationalcaps1 = 3
| nationalteam2 = [[England national football team|England]] | nationalcaps2 = 80 <!-- update after each match -->
| nationalyears2 = 2019-
}}`;
  assert.deepEqual(englandCaps(rice), { caps: 80, years: "2019–", asOf: null });
});

test("ignores England B and amateur sides", () => {
  const b = `{{Infobox football biography
| nationalteam1 = [[England national football B team|England B]]
| nationalcaps1 = 4
}}`;
  assert.equal(englandCaps(b), null);
});

test("returns null for pages without an infobox, such as disambiguation pages", () => {
  assert.equal(englandCaps("'''Mark Wright''' may refer to:\n* [[Mark Wright (footballer, born 1963)]]"), null);
});

test("reads the current squad table", () => {
  const page = `==Players==
{{nat fs g start}}
{{nat fs g player|no=1|pos=GK|name=[[Jordan Pickford]]|age={{birth date and age|1994|3|7|df=y}}|caps=91|goals=0|club=[[Everton F.C.|Everton]]|clubnat=ENG}}
{{nat fs g player|no=9|pos=FW|name=[[Harry Kane]] ([[Captain (association football)|captain]])|caps=121|goals=80|club=[[FC Bayern Munich|Bayern Munich]]|clubnat=GER}}
{{nat fs g player|no=24|pos=DF|name=[[Jarell Quansah|Jarell Quansah]]|caps=3|goals=0|club=Bayer Leverkusen}}
{{nat fs break}}`;
  assert.deepEqual(currentSquad(page), [
    { wiki: "Jordan Pickford", name: "Jordan Pickford", pos: "GK", caps: 91 },
    { wiki: "Harry Kane", name: "Harry Kane", pos: "FW", caps: 121 },
    { wiki: "Jarell Quansah", name: "Jarell Quansah", pos: "DF", caps: 3 },
  ]);
});

test("lists candidate articles from a disambiguation page", () => {
  const page = `'''Billy Wright''' may refer to:
* [[Billy Wright (footballer, born 1924)|Billy Wright (footballer, born 1924)]], England captain
* [[Billy Wright (loyalist)]], Northern Irish loyalist
* [[Bill Wright]]`;
  assert.deepEqual(candidateTitles(page, "Billy Wright"), ["Billy Wright (footballer, born 1924)", "Billy Wright (loyalist)"]);
});

test("clean strips refs, comments and templates", () => {
  assert.equal(clean("57<ref name=x/> <!-- note --> {{efn|x}}"), "57");
});
