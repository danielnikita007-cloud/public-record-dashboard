# Stop uploading files one at a time

Almost every problem in this project has come from the same place: I hand you
files, you copy each one into GitHub's web editor by hand, one gets missed or
half-pasted, the build breaks, and we spend a round debugging it.

Set this up once (about 10 minutes) and that whole class of problem disappears.
After this, updating your site is **three commands**, and every file changes at
once — no missed files, no partial pastes.

## One-time setup

### 1. Install Git
Download from https://git-scm.com/download/win and install with all defaults.

### 2. Clone your repo (do this ONCE, in a fresh folder)
Open PowerShell somewhere sensible (e.g. `C:\Users\nikit\Documents`) and run:

```
git clone https://github.com/danielnikita007-cloud/public-record-dashboard.git
cd public-record-dashboard
```

GitHub will ask you to sign in — follow the browser prompt.

You now have a folder that is *linked* to GitHub. This replaces all your
`investigative-dashboard_1/2/3` download folders. Work only in this one.

### 3. Move your big local files in
Copy `aoc_tenders.db` into `services/scraper/data/` in this new folder, and
recreate your `.env` (it's gitignored, so it stays local and private).

## Every update after that

When I give you new or changed files, unzip them over this folder (replacing
what's there), then run:

```
git add .
git commit -m "describe what changed"
git push
```

That's it. Render sees the push and redeploys automatically — same as now, but
you can never again miss a file or paste half of one.

## Two commands worth knowing

Check what you're about to send, before sending it:
```
git status
```

Undo local changes if something goes wrong:
```
git checkout .
```

## Why this matters here specifically

The `ObservatoryHeader` build failure, the missing `stateCoords.ts`, the
`MacroBudgetTreemap` that never got created, the `package.json` where
`mapbox-gl` went missing — every one of those was a file that didn't make it
through manual upload. None of them can happen this way, because `git add .`
takes everything at once.
