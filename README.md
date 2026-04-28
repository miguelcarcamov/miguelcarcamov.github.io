# Miguel Cárcamo - Academic Portfolio Website

Personal academic portfolio website built with Jekyll and hosted on GitHub Pages.

## 🚀 Quick Start

### Prerequisites
- Ruby (2.7 or higher)
- Bundler gem

### Local Development

1. **Install dependencies:**
   ```bash
   bundle install
   ```

2. **Run Jekyll server:**
   ```bash
   bundle exec jekyll serve
   ```

3. **View site:**
   Open [http://localhost:4000](http://localhost:4000) in your browser

### Building for Production

```bash
bundle exec jekyll build
```

The site will be built to the `_site` directory.

## 📁 Project Structure

```
.
├── _config.yml          # Jekyll configuration
├── _includes/           # Reusable components
│   └── sections/        # Section includes (home, about, etc.)
├── _layouts/            # Page layouts
│   └── default.html     # Main layout
├── _posts/              # Blog posts (Markdown files)
├── css/                 # Stylesheets
├── js/                  # JavaScript files
├── images/              # Images and assets
├── index.html           # Main page (includes all sections)
└── Gemfile              # Ruby dependencies
```

## ✍️ Adding Blog Posts

Create a new Markdown file in `_posts/` with the following naming convention:
```
YYYY-MM-DD-post-title.md
```

Example: `2024-01-15-my-research-update.md`

Each post should have front matter:

```yaml
---
layout: post
title: "Your Post Title"
date: 2024-01-15
author: "Miguel Cárcamo"
category: "Research"
image: "/images/blog1.jpg"
excerpt: "A short description of your post"
---

Your post content goes here in Markdown format...
```

## 🔧 Configuration

### Site Settings
Edit `_config.yml` to update:
- Site title and description
- Author information
- Social media links
- URL settings

### Contact Form
The contact form uses a **mailto:** link that opens the user's email client with a pre-filled message. **No signup or configuration required!**

**How it works:**
- User fills out the form and clicks "Send Message"
- Their email client opens automatically with all form data
- User clicks "Send" in their email client

**Alternative options:**
- See `CONTACT-FORM-OPTIONS.md` for other options (EmailJS, PHP, etc.)
- If you want automatic email sending without opening email client, see `EMAILJS-SETUP.md`

## 📝 Updating Content

### Sections
All sections are in `_includes/sections/`. Edit the HTML files directly:
- `home.html` - Hero section
- `about.html` - About me section
- `resume.html` - Resume/CV section
- `publications.html` - Publications list
- `teaching.html` - Teaching courses
- `collaborators.html` - Collaborators
- `students.html` - Student supervision
- `service.html` - Services
- `blog.html` - Blog listing (auto-generated from `_posts/`)
- `contact.html` - Contact form

## Publications Automation (NASA ADS)

Publications are now rendered from `_data/publications.yml`, which is synchronized from NASA ADS.

### One-time setup in GitHub

1. In your GitHub repository settings, add secret:
   - `ADS_API_TOKEN` = your NASA ADS API token
2. Go to **Actions** and run workflow:
   - `Sync NASA ADS Publications`

The workflow also runs:
- weekly on schedule
- manually from Actions

For push deployments, use the `Build and Deploy Pages` workflow, which runs ADS sync first and only then deploys the site. This workflow does not commit `_data/publications.yml`, so your branch is not mutated during deploy.

Use `Sync NASA ADS Publications` when you want to persist synchronized data back into the repository (manual or weekly run).

> Important: in repository settings, set **Pages source** to **GitHub Actions** so deployment is controlled by workflow order.

### Run sync locally (optional)

```bash
ADS_API_TOKEN=your_token_here python scripts/sync_ads_publications.py --orcid 0000-0003-0564-8167
```

Recommended explicit query (to avoid same-surname author collisions):

```bash
ADS_API_TOKEN=your_token_here python scripts/sync_ads_publications.py \
  --orcid 0000-0003-0564-8167 \
  --author "Carcamo, Miguel" \
  --author "Cárcamo, Miguel"
```

### Main Page
The main page (`index.html`) includes all sections in order. To reorder sections, edit the include statements.

## 🎨 Customization

### Styles
- Main stylesheet: `style.css`
- Additional CSS files in `css/` directory

### JavaScript
- Main functionality: `js/main.js`
- All JavaScript effects (typing, transitions, etc.) work as before

## 📦 Deployment

This site is configured for GitHub Pages. Simply push to the repository and GitHub will automatically build and deploy:

1. Push changes to GitHub
2. GitHub Pages will automatically build using Jekyll
3. Site will be live at `https://miguelcarcamov.github.io`

### Manual Deployment
If you need to deploy manually:

```bash
bundle exec jekyll build
# Then upload _site/ contents to your web server
```

## 🔄 Migration Notes

This site was migrated from a static HTML site to Jekyll. Key changes:

- ✅ Sections moved to `_includes/sections/`
- ✅ Blog posts now use Jekyll posts (Markdown) instead of JSON
- ✅ Contact form updated to use Formspree (replaces PHP)
- ✅ All JavaScript effects preserved
- ✅ All styling preserved

## 📚 Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Liquid Template Language](https://shopify.github.io/liquid/)

## 📄 License

This website is personal and proprietary.

---

**Maintained by:** Miguel Cárcamo  
**Last Updated:** 2024

