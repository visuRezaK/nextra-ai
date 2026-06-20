from playwright.sync_api import sync_playwright
import os

html_path = r"C:\Users\Admin\Desktop\mysite\brand\brand_guide_v2.html"
pdf_path  = r"C:\Users\Admin\Desktop\mysite\brand\brand_guide_v2.pdf"
url = "file:///" + html_path.replace("\\", "/")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 900})
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.pdf(
        path=pdf_path,
        format="A4",
        print_background=True,
        margin={"top": "24px", "bottom": "24px", "left": "24px", "right": "24px"}
    )
    browser.close()

size = os.path.getsize(pdf_path)
print(f"Done: {pdf_path} ({size // 1024} KB)")
