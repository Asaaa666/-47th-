import asyncio
from playwright.async_api import async_playwright

async def test_image_loading():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        response = await page.goto("https://47th.vercel.app/", wait_until="networkidle")
        print(f"ページHTTPステータス: {response.status}")

        images = await page.query_selector_all("img")
        print(f"検出された画像数: {len(images)}")

        for img in images:
            src = await img.get_attribute("src")
            is_loaded = await page.evaluate(
                "(img) => img.complete && img.naturalWidth !== 0", img
            )
            
            if is_loaded:
                print(f"〇 表示成功: {src}")
            else:
                print(f"× 表示失敗（リンク切れまたは読み込みエラー）: {src}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_image_loading())
