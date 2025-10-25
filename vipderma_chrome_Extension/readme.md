We have a website called vipderma.ir
it sells cosmetic products.

We built this website using services of a very restrictive 
sitebuilder called webzi.ir

we like to create a chrome browser extension that puts an
edit this product button on the product pages of the production
website vipderma.ir that when click would take the user to the
product edit page at the site builder.

The formats are laid out in the below example:

typical product page:
https://vipderma.ir/shop/%D8%B3%D8%B1%D9%85-%D9%85%D9%88/P47819-%D8%B3%D8%B1%D9%85-%D9%85%D9%88-%D9%86%D8%B1%D9%85-%DA%A9%D9%86%D9%86%D8%AF%D9%87-%D9%BE%D9%88%D8%B3%D8%AA-%D8%B3%D8%B1-%D9%88%D8%A7%D8%B2%D9%84%DB%8C%D9%86-%D8%AD%D8%AC%D9%85-100-%D9%85%DB%8C%D9%84-%D8%A7%D9%88%D8%B1%D8%AC%DB%8C%D9%86%D8%A7%D9%84-hair-tonic-scalp-emollient-vaseline-100-ml.html

note the P47819 in the url this is the internal product id

the product edit page is located at:
https://660e731603650.mywebzi.ir/admin11397e41a33aef/shop/products/edit/47819/

note that https://660e731603650.mywebzi.ir/admin11397e41a33aef is unique to vipderma and note that
the end part of the ulr for edition is the product ID

note that the product id can either be found in the dom at 
<meta name="product_id" content="47819">

or in the URL   https://vipderma.ir/shop/%D8%B3%D8%B1%D9%85-%D9%85%D9%88/P47819{rest of it}

we must build a very minial chrome extension that does not slow down other tabs or the experince but only does this one thing.