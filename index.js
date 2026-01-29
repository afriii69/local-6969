const diddyhack = require("puppeteer");
const fs = require('fs');
const readline = require('readline');

async function main() {
    console.log('searching anuan yg ada 6969');

    let browser;
    try {
        browser = await diddyhack.connect({
            browserURL: 'http://localhost:6969'
        });
        console.log('ACC');
    } catch (error) {
        console.error("anuan 6969 not found, check package.json at go_ai");
        return;
    }

    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('chatgpt.com'));

    if (!page) {
        console.log('browser didnt open chatgpt, lets add gpt page...');
        page = await browser.newPage();
        await page.goto('https://chatgpt.com/');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    try {
        const logoutSelector = 'a[href="#"][class*="text-token-text-secondary"]';
        await page.waitForSelector(logoutSelector, { timeout: 5000 });
        await page.click(logoutSelector);
        console.log('Clicked "Stay logged out"');
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
        console.log('"Stay logged out" not found or already handled');
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\nChatGPT Terminal Interface Ready!');
    console.log('Type your messages and press Enter. Type "exit" to quit.\n');

    function ask() {
        rl.question('You: ', async (message) => {
            if (message.toLowerCase() === 'exit') {
                console.log('Goodbye!');
                await browser.disconnect();
                rl.close();
                return;
            }

            try {
                const inputSelectors = [
                    'p[data-placeholder="Ask anything"]',
                    'textarea[data-testid="prompt-textarea"]',
                    'div[data-testid="prompt-textarea"] p',
                    '[contenteditable="true"]'
                ];

                let inputFound = false;
                for (const selector of inputSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 2000 });
                        await page.click(selector);

                        for (const char of message) {
                            await page.keyboard.press(char);
                            await new Promise(resolve => setTimeout(resolve, Math.random() * 53));
                        }

                        inputFound = true;
                        break;
                    } catch (e) {
                        continue;
                    }
                }

                if (!inputFound) {
                    console.log('Could not find input field. Make sure ChatGPT page is loaded and ready.');
                    ask();
                    return;
                }

                await page.keyboard.press('Enter');

                console.log('Waiting for response...');

                let isLoading = true;
                let attempts = 0;
                const maxAttempts = 120;

                while (isLoading && attempts < maxAttempts) {
                    try {
                        const loadingElement = await page.$('[data-testid="loading"]');
                        isLoading = loadingElement !== null;
                        if (isLoading) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            attempts++;
                        }
                    } catch (e) {
                        isLoading = false;
                    }
                }

                if (attempts >= maxAttempts) {
                    console.log('Response timeout, proceeding...');
                }

                console.log('GPT Writing...');
                let previousText = '';
                let stableCount = 0;
                const maxStableChecks = 30;

                while (stableCount < 5 && attempts < maxStableChecks) {
                    try {
                        const responseElement = await page.$('article[data-turn="assistant"]:last-child .markdown.prose.w-full.wrap-break-word.markdown-new-styling');
                        if (responseElement) {
                            const currentText = await page.evaluate(el => el.textContent, responseElement);
                            if (currentText === previousText && currentText.trim()) {
                                stableCount++;
                            } else {
                                stableCount = 0;
                                previousText = currentText;
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                    } catch (e) {
                        break;
                    }
                }

                console.log('Response appears to be complete.');

                let response = 'gd respon';
                const responseSelectors = [
                    'article[data-turn="assistant"]:last-child .markdown.prose.w-full.wrap-break-word.markdown-new-styling',
                    'div[data-message-author-role="assistant"]:last-child .markdown.prose.w-full.wrap-break-word.markdown-new-styling',
                    'div[data-message-author-role="assistant"]:last-child .markdown',
                    'div[data-message-id]:last-child .markdown p',
                    'p[data-start]:last-child',
                    '.markdown p:last-child'
                ];

                for (const selector of responseSelectors) {
                    try {
                        const element = await page.$(selector);
                        if (element) {
                            response = await page.evaluate(el => el.textContent, element);
                            if (response && response.trim()) {
                                break;
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }

                const chatEntry = `You: ${message}\n AI: ${response}\n\n`;
                fs.appendFileSync('chat.txt', chatEntry);

                console.log(`AI: ${response}\n`);

            } catch (error) {
                console.error('Error during interaction:', error.message);
            }

            ask();
        });
    }

    ask();
}

main().catch(console.error);
