# Clearlist

A clean, mobile-friendly to-do list organized into sections. Data is stored in `data/todos.json`.

## Edit locally

```bash
npm run dev
```

Open `http://localhost:3000`. Adding, completing, or deleting a task automatically writes the changes back to the JSON file. Commit and push the code as usual to update the online version.

## Read-only mode

```bash
npm start
```

`npm start` sets `READ_ONLY=true`, hides editing controls, and makes the server reject all write requests. Setting `NODE_ENV=production` also enables read-only mode automatically.

To use a custom port, run `PORT=8080 npm run dev`.

## Deploy to GitHub Pages

The repository already includes `.github/workflows/pages.yml`. For the first deployment, open your GitHub repository and:

1. **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push the code to `main`

The workflow assembles the files in `public` and `data/todos.json` into a static site and deploys it. Repository data is always read-only online. To update it, run `npm run dev` locally, edit your tasks, then commit and push the changes.

On the deployed site, you can also choose **Edit on this device**. Changes are saved in the browser's `localStorage`; they are not written to the repository or synced to other devices. The page also lets you export the data as JSON or restore the online version.
