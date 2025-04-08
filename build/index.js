// Dominican Congress Watcher - MCP Server
// Uses TypeScript and MCP SDK to provide live updates from SenadoRD and Cámara de Diputados
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import puppeteer from "puppeteer";
// Create the MCP server
const server = new McpServer({
    name: "Dominican Congress MCP",
    version: "1.0.0"
});
// Tool: Fetch Legislative Agenda
server.tool("fetch-legislative-agenda", {
    chamber: z.enum(["senate", "deputies"]),
}, async ({ chamber }) => {
    const agenda = await crawlAgenda(chamber);
    return {
        content: [{ type: "text", text: agenda }]
    };
});
// Tool: Get Legislator Activity
server.tool("get-legislator-activity", {
    name: z.string(),
}, async ({ name }) => {
    const summary = await getLegislatorHistory(name);
    return {
        content: [{ type: "text", text: summary }]
    };
});
// Tool: Summarize Today's Legislative Activity
server.tool("summarize-today", {}, async () => {
    const summary = await summarizeTodayCongress();
    return {
        content: [{ type: "text", text: summary }]
    };
});
// Tool: Alert on New Bills
server.tool("alert-new-bills", {}, async () => {
    const updates = await checkNewBills();
    return {
        content: [{ type: "text", text: updates }]
    };
});
// Resource: Daily Bulletin
server.resource("daily-bulletin", new ResourceTemplate("bulletin://{date}", { list: undefined }), async (uri, { date }) => {
    const bulletin = await getCongressBulletin(date);
    return {
        contents: [{
                uri: uri.href,
                text: bulletin,
            }],
    };
});
// --- Implementation Helpers ---
async function crawlAgenda(chamber) {
    const baseUrl = chamber === "senate"
        ? "https://www.senadord.gob.do/orden-del-dia/"
        : "https://camaradediputados.gob.do/";
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle0' }); // Wait for network activity to cease
    // Get main page text
    let mainText = await page.evaluate(() => document.body.innerText);
    // Find PDF links
    const pdfLinks = await page.$$eval('a[href$=".pdf"]', (links, pageUrl) => links.map(link => ({
        href: new URL(link.getAttribute('href') || '', pageUrl).href, // Resolve relative URLs
        name: link.textContent?.trim() || link.getAttribute('href')?.split('/').pop() || 'unknown.pdf' // Get name from text or filename
    })), baseUrl); // Pass baseUrl to resolve relative URLs correctly
    let pdfContentText = "";
    // Download and parse PDFs
    for (const link of pdfLinks) {
        try {
            console.log(`Fetching PDF: ${link.href}`);
            // const response = await axios.get(link.href, { responseType: 'arraybuffer' });
            // const data = await pdf.default(response.data); // Use .default with namespace import
            // console.log(`Parsed PDF: ${link.name}`);
            // Sanitize PDF text slightly (replace multiple newlines/spaces)
            // const parsedPdf = data.text.replace(/(\s*\n){3,}/g, '\n\n').replace(/ {2,}/g, ' ');
            pdfContentText += `\n\n--- PDF Content: ${link.name} ---\n\n--- End PDF: ${link.name} ---\n`;
        }
        catch (error) {
            console.error(`Error processing PDF ${link.name} (${link.href}): ${error.message}`);
            pdfContentText += `\n\n--- Error processing PDF: ${link.name} (${link.href}) ---`;
        }
    }
    await browser.close();
    const combinedText = `Resume la agenda legislativa del siguiente texto extraído del sitio web del congreso (${chamber}):\n\n${mainText}${pdfContentText}`;
    return combinedText;
}
async function getLegislatorHistory(name) {
    const url = `https://www.camaradediputados.gob.do/\nhttps://www.senadord.gob.do/`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return `Busca toda la información sobre la actividad reciente del legislador o legisladora llamado/a ${name} y resumenla de forma clara y cronológica:\n\n${text}`;
}
async function summarizeTodayCongress() {
    const senate = await crawlAgenda("senate");
    const deputies = await crawlAgenda("deputies");
    const fullText = `Agenda Senado:\n${senate}\n\nAgenda Diputados:\n${deputies}`;
    return `Resume el trabajo legislativo del día a partir del siguiente texto combinado del Senado y Cámara de Diputados:\n\n${fullText}`;
}
async function checkNewBills() {
    const url = "http://www.senado.gov.do/wfilemaster/lista_expedientes.aspx?coleccion=53";
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return `Busca y resume cualquier propuesta de ley nueva publicada recientemente en el siguiente texto:\n\n${text}`;
}
async function getCongressBulletin(date) {
    const url = `https://www.senadord.gob.do/orden-del-dia/`; // Placeholder
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return `Extrae y resume el boletín legislativo del día ${date} del siguiente contenido web:\n\n${text}`;
}
const PORT = process.env.PORT || 8089;
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
    console.log(`Dominican Congress MCP server running on port ${PORT}`);
});
export default server;
