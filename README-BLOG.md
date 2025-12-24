# Blog Posts - Easy Editing Guide

## Quick Start

1. Open `blog-posts.json`
2. Copy the example from `blog-posts.example.json` 
3. Modify the values for your post
4. Save the file

## Blog Post Structure

Each blog post is a JSON object with these fields:

```json
{
  "title": "Your Blog Post Title",
  "date": "January 1, 2024",
  "excerpt": "A short description or excerpt of your blog post...",
  "image": "images/blog1.jpg",
  "link": "single_blog.html",
  "author": "Miguel Cárcamo",
  "category": "Research"
}
```

## Image Instructions

**Important**: Blog posts require images!

- **Location**: Place your images in the `images/` folder
- **Path format**: Use `"images/your-image-name.jpg"` in the JSON
- **Example**: 
  - Image file: `images/my-research-post.jpg`
  - In JSON: `"image": "images/my-research-post.jpg"`
- **Recommended size**: 800x600px or similar aspect ratio
- **Supported formats**: JPG, PNG, GIF

## Adding Your First Post

1. Copy this example into `blog-posts.json`:

```json
[
  {
    "title": "My First Blog Post",
    "date": "January 1, 2024",
    "excerpt": "This is my first blog post about my research...",
    "image": "images/blog1.jpg",
    "link": "single_blog.html",
    "author": "Miguel Cárcamo",
    "category": "Research"
  }
]
```

2. Replace the values:
   - Change `"title"` to your post title
   - Change `"date"` to your publication date
   - Change `"excerpt"` to a short description
   - Change `"image"` to your image path (e.g., `"images/my-image.jpg"`)
   - Change `"category"` if needed (e.g., "Research", "Computing", "Astronomy")

## Adding Multiple Posts

Separate posts with commas (but NO comma after the last one):

```json
[
  {
    "title": "First Post",
    "date": "January 1, 2024",
    "excerpt": "First post description...",
    "image": "images/blog1.jpg",
    "link": "single_blog.html",
    "author": "Miguel Cárcamo",
    "category": "Research"
  },
  {
    "title": "Second Post",
    "date": "February 1, 2024",
    "excerpt": "Second post description...",
    "image": "images/blog2.jpg",
    "link": "single_blog.html",
    "author": "Miguel Cárcamo",
    "category": "Computing"
  }
]
```

## Field Descriptions

- **title**: The blog post title (displayed prominently)
- **date**: Publication date (any format you prefer, e.g., "January 1, 2024")
- **excerpt**: Short description shown on the blog listing page
- **image**: **REQUIRED** - Path to image file in `images/` folder (e.g., `"images/blog1.jpg"`)
- **link**: URL to full blog post page (usually `"single_blog.html"`)
- **author**: Author name (typically "Miguel Cárcamo")
- **category**: Post category (e.g., "Research", "Computing", "Astronomy")

## Important Notes

- **Images are required**: Each post must have an image
- **No trailing commas**: The last post should NOT have a comma after the closing `}`
- **Valid JSON**: Make sure your JSON is properly formatted
- **Empty array**: To show no posts, use: `[]`
- **See example file**: Check `blog-posts.example.json` for a complete working example

## Troubleshooting

- If posts don't appear, check the browser console (F12) for JSON errors
- Make sure image paths are correct and images exist in the `images/` folder
- Validate your JSON at jsonlint.com if you're having issues
- Remember: image paths should start with `"images/"` and match files in your `images/` folder
