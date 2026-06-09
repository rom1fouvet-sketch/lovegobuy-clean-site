# BeProud Finds — Google Sheets powered catalog

This site updates automatically from a Google Sheet published as CSV. No rebuild is required when you add products: update your spreadsheet, refresh the site.

## 1. Required Google Sheet columns

Create one sheet named `products` with this exact first row:

```csv
product_group_id,variant_id,category,subcategory,brand,name,color,size,price,currency,product_url,image_url,qc_url,quality,status
```

Required columns:

- `product_group_id`: same value for variants of the same product, for example `nike-af1-001`
- `variant_id`: unique variant number, for example `1`, `2`, `3`
- `category`: Shoes, Clothing, Sportswear, Accessories, Bags, Electronics...
- `subcategory`: Sneakers, Hoodies, T-Shirts, Pants...
- `brand`: Nike, Adidas, Ralph Lauren...
- `name`: product name
- `color`: Black, White, Navy...
- `size`: optional, for example `S-XL` or `36-45`
- `price`: number only, for example `24.99`
- `currency`: USD or EUR
- `product_url`: direct product link
- `image_url`: direct image URL
- `qc_url`: optional QC link
- `quality`: optional note, for example `9/10`
- `status`: use `active` to display, `hidden` to hide

## 2. Variants / colors

If the same product has several colors, repeat rows with the same `product_group_id` and different `color`, `image_url` and `product_url`.

Example:

```csv
product_group_id,variant_id,category,subcategory,brand,name,color,size,price,currency,product_url,image_url,qc_url,quality,status
rl-hoodie-001,1,Clothing,Hoodies,Ralph Lauren,Ralph Lauren Hoodie,Black,S-XL,25.99,USD,https://product-black,https://image-black.webp,,9/10,active
rl-hoodie-001,2,Clothing,Hoodies,Ralph Lauren,Ralph Lauren Hoodie,Navy,S-XL,25.99,USD,https://product-navy,https://image-navy.webp,,9/10,active
```

The site will display one product card with a color selector.

## 3. Publish the Google Sheet as CSV

In Google Sheets:

1. File
2. Share
3. Publish to web
4. Select the `products` sheet
5. Choose CSV
6. Publish
7. Copy the generated CSV URL

## 4. Connect the sheet to the site

Open `config.js` and replace:

```js
window.SHEET_CSV_URL = "PASTE_YOUR_PUBLISHED_CSV_URL_HERE";
```

with your published CSV URL.

## 5. Deploy on Vercel

Upload these files to a GitHub repository, then import the repository in Vercel.

Because this is a static site, you do not need Google Cloud, API keys, serverless functions or Next.js.

## 6. Updating products

Add or edit rows in the Google Sheet. Refresh the site and products will update automatically.
