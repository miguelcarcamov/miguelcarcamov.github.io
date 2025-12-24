# Website Structure Documentation

## File Organization

### Main Files
- `index.html` - Main page containing all sections
- `single_blog.html` - Individual blog post page template
- `style.css` - Main stylesheet
- `form-process.php` - Contact form backend processor

### Sections in index.html
The main page contains the following sections (in order):
1. **Home** - Hero section with greeting
2. **About** - Personal information and bio
3. **Resume** - Education, work experience, skills, and ongoing projects
4. **Publications** - First author and co-authored publications
5. **Teaching** - Current and previous courses
6. **Collaborators** - Key collaborators and collaborating institutions
7. **Students** - Current and former students
8. **Services** - Research services offered
9. **Blog** - Dynamic blog posts loaded from JSON
10. **Contact** - Contact form

### Removed/Unused Files
- `single_portfolio.html` - **DELETED** (portfolio section was removed from the site)

### Unused Images (can be removed if desired)
The following images in `images/` are likely unused:
- `portfolio1.png` through `portfolio5.png` - Portfolio images (portfolio section removed)
- `cl1.png`, `cl2.png`, `cl3.png` - Client logos (testimonial section removed)

**Note:** `rel1.jpg` through `rel4.jpg` are used in `single_blog.html` for related posts, so keep those.

### Data Files
- `blog-posts.json` - Blog posts data (empty array, ready for posts)
- `blog-posts.example.json` - Example blog post structure
- `cv-llt.pdf` - CV document

### JavaScript Files
- `js/main.js` - Main JavaScript for site functionality (form handling, blog loading, navigation)

## Modular Structure

For easier maintenance, consider:
1. Each major section in `index.html` is clearly marked with HTML comments
2. Blog posts are loaded dynamically from `blog-posts.json`
3. Contact form uses separate PHP processor

## Future Improvements

To make the site more modular:
1. Extract sections into separate HTML files in a `sections/` directory
2. Use a build script to combine sections into `index.html`
3. Or use JavaScript to dynamically load sections (may affect SEO)

