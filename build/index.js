// Dominican Congress Watcher - MCP Server
// Uses TypeScript and MCP SDK to provide live updates from SenadoRD and Cámara de Diputados
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import puppeteer from "puppeteer";
import axios from "axios";
import pdf from 'pdf-parse/lib/pdf-parse.js';
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
// Tool: Parse PDF
server.tool("parse-pdf", {
    pdfUrl: z.string().url()
}, async ({ pdfUrl }) => {
    try {
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const data = await pdf(response.data);
        return {
            content: [{ type: "text", text: data.text }]
        };
    }
    catch (error) {
        console.error(`Error processing PDF ${pdfUrl}: ${error.message}`);
        return {
            content: [{ type: "text", text: `Error processing PDF: ${error.message}` }],
            isError: true
        };
    }
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
    await page.evaluate(() => document.body.innerHTML);
    // Find PDF links
    const pdfLinks = await page.$$eval('a.wpfd_downloadlink', (links, pageUrl) => links.map(link => ({
        href: new URL(link.getAttribute('href') || '', pageUrl).href, // Resolve relative URLs
        name: link.textContent?.trim() || link.getAttribute('href')?.split('/').pop() || 'unknown.pdf' // Get name from text or filename
    })), baseUrl); // Pass baseUrl to resolve relative URLs correctly
    let pdfContentText = "";
    // Download and parse PDFs
    /*
    for (const link of pdfLinks) {
      try {
        console.log(`Parsing PDF: ${link.href}`);
        if (pdfResult?.content?.[0]?.text) {
          pdfContentText += `\n\n--- PDF Content: ${link.name} ---\n${pdfResult.content[0].text}\n--- End PDF: ${link.name} ---\n`;
        } else {
          pdfContentText += `\n\n--- Error processing PDF: ${link.name} (${link.href}) ---`;
        }
      } catch (error: any) {
        console.error(`Error processing PDF ${link.name} (${link.href}): ${error.message}`);
        pdfContentText += `\n\n--- Error processing PDF: ${link.name} (${link.href}) ---`;
      }
    }
    */
    let mainText = await page.evaluate(() => document.body.innerText);
    await browser.close();
    const combinedText = `Resume la agenda legislativa del siguiente texto extraído del sitio web del congreso (${chamber}).  The following PDFs were found, please parse them using the parse-pdf tool:\n${pdfLinks.map(link => link.href).join('\n')}\n\n${mainText}`;
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
