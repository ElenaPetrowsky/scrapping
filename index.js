const puppeteer = require("puppeteer");
const cheerio = require("cherio");
const axios = require("axios")
const fs = require('fs')

// const baseURL = "https://pharma-consults.net/pharmacies-gardes"
const baseURL = "https://pharma-consults.net/pharmacies-gardes/filtre?commune=all&assurances=all"


// Cette fonction a pour role de recuperer les infos venant de chaque ligne de tableau contenant les informations
// sur chaque pharmacie
const recupererInfo = (el)=>{

    // un élément de type $(_selector_) est envoyé à la fonction
    // .find permet alors de faire une recherche sur cet élement afin de
    // trouver ses enfant qui matchent avec le selecteur 
        let colZero = el.find('td:nth-child(1)')
        let firstCol = el.find('td:nth-child(2)')
        let secondCol = el.find('td:nth-child(3)')
        let fourthCol = el.find('td:nth-child(5)')
        let fifthCol = el.find('td:nth-child(6)')


        let startPermanence = fourthCol.text()
        let endPermanence = fifthCol.text()
        let pharmaName = colZero.text().replace(/\s+/g, ' ') // Suppression de tous les espaces supplémentaires
        let gerant = firstCol.text().split("\n")[0].trim()    // Suppression des espaces et des retour à la ligne
        let contact = firstCol.text().split(":")[1].split("\n")[0].trim()

        let situationGeo = secondCol.text().split("\n")[0].trim()
        let localisation = secondCol.find('a').first().attr("href") // recupereration de la valeur de l'attribut href

    return {pharmaName, gerant, contact, situationGeo, localisation, startPermanence, endPermanence}
}

const fetchWithPuppeteer = async ()=>{

    const browser = await puppeteer.launch({
        headless:true,
        defaultViewport:{
            width: 1080,
            height: 720
        }
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
        if (interceptedRequest.isInterceptResolutionHandled()) return;

        if (interceptedRequest.resourceType() === "document")

          interceptedRequest.continue();

        else interceptedRequest.abort();
      });

    await page.goto(baseURL);

    const pageData = await page.evaluate(()=>{
        return {
            html: document.documentElement.innerHTML,
        }
    })

    const $ = cheerio.load(pageData.html)

    table = $('.alert')

    let list = []

    table.each((i,e)=>{

        if($(e).hasClass("alert")){
            obj = {
                commune:$(e).text().trim(),
                pharm:[]
            }
            $(e).nextAll('table').first().find('tbody tr').each((i,el)=>{

                // .nextAll() : Sélection de toutes les balises de type 'table' suivant l'élement 'e'
                // .first() : Sélection du premier element de la sélection précédente
                // .find(): recherche parmis les descendants ceux respectant le selecteur 
                // .each(): boucle de parcours (équivalent de forEach sur les array)

                let row = recupererInfo($(el))

                obj.pharm.push(row); 
            })
            list.push(obj)

        }
    })

    let objet = JSON.stringify(list )
    fs.writeFile('objet.json', objet, 'utf8', (err) => {
        if (err) throw err;
        console.log('Le fichier a été enregistré!');
    });

    await browser.close()
};

fetchWithPuppeteer()