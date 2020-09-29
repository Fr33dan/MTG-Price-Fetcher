function GetCardData_(name)
{
  var cache = CacheService.getScriptCache();
  
  var cardData;
  var jsonData = cache.get(name);
  if(jsonData == null  || jsonData == "undefined"){
    var fetchName = name;
    var splitLocation = name.indexOf("//");
    if(splitLocation>-1)
    {
      fetchName = name.substring(0,splitLocation).trim();
    }
    var url = "https://api.magicthegathering.io/v1/cards?name=" + fetchName;
    var jsonData = UrlFetchApp.fetch(url).getContentText();
    var parsedJSON = JSON.parse(jsonData);
    for(var j = 0;cardData == null && j < parsedJSON.cards.length;j++)
    {
      if(parsedJSON.cards[j].name == fetchName)
      {
        cardData = parsedJSON.cards[j];
      }
    }
    
    cache.put(name, JSON.stringify(cardData), 86400)
  } else
  {
    cardData = JSON.parse(jsonData);
  }
  
  return cardData;
}

function GetSetTable_(setCode, online)
{
  var cache = CacheService.getScriptCache();
  
  var cacheValue = cache.get(setCode);
  var bothTables;
  if(cacheValue == "undefined" || cacheValue == null || cacheValue == "null")
  {
    bothTables = LoadSetTables_(setCode);
    
    // Cache lasts one day
    cache.put(setCode, JSON.stringify(bothTables), 86400)
  } else
  {
    bothTables = JSON.parse(cacheValue);
  }
  return online ? bothTables[1] : bothTables[0];
}

function LoadSetTables_(setCode)
{
  if(setCode == "pFNM")
  {
    setCode = "PRM-FNM";
  } else if(setCode == "pJGP")
  {
    setCode = "PRM-JUD";
  }
  var url = "https://www.mtggoldfish.com/index/" + setCode
  var priceListPage = UrlFetchApp.fetch(url,{muteHttpExceptions:true});
  if(priceListPage.getResponseCode() != 200)
  {
    return [];
  }  
  var priceListText = priceListPage.getContentText();
  
  var paperTableText =  FindTableBody_(FindHTMLObjectByClass_(priceListText,"div","index-price-table-paper"));
  var onlineTableText = FindTableBody_(FindHTMLObjectByClass_(priceListText,"div","index-price-table-online"));
  
  var returnVal = [ParseTableFromHTML_(paperTableText),ParseTableFromHTML_(onlineTableText)];
  
  return returnVal;
}

function ParseTableFromHTML_(tableText)
{
  var dictionary = [];
  
  for(var i = tableText.indexOf("<tr>");i != -1;i = tableText.indexOf("<tr>", i + 1))
  {
    var row = tableText.substring(i,FindHTMLObjectEnd_(tableText,"tr",i));
    
    var column = 0;
    
    var nameFromTable;
    var newPrice;
    var lastEnd; 
    for(var j = row.indexOf("<td");j != -1;j = row.indexOf("<td", lastEnd + 1))
    {
      lastEnd = FindHTMLObjectEnd_(row,"td",j)
      var data = row.substring(row.indexOf(">",j) + 1,lastEnd - 5);
      
      if(column == 0)
      {
        nameFromTable = data.substring(data.indexOf(">") + 1,data.indexOf("</a>"));
      }
         
      if(column == 3)
      {
        newPrice = Number(data.replace(/,/g, ''));;
        break;
      }
      
      column++;
    }
    dictionary.push({
      name:   nameFromTable,
      value: newPrice
    });
  }
  return dictionary;
}

function FindTableBody_(html)
{
  var start = html.indexOf("<tbody");
  var end = FindHTMLObjectEnd_(html, "tbody", start);
  return html.substring(start,end);
}

function FindHTMLObjectByClass_(html, objectType, objectClass)
{
  var start = FindHTMLObjectStartByClass_(html, objectType, objectClass);
  return html.substring(start,FindHTMLObjectEnd_(html, objectType, start));
}

function FindHTMLObjectStartByClass_(html, objectType, divClass)
{
  return html.search("<" + objectType +" class='[^\"']*?" + divClass + "[^\"']*?'>");
}

function FindHTMLObjectEnd_(html, objectType, divStartLoc)
{
  var depth = 0;
  var currentLoc;
  for(currentLoc = divStartLoc; currentLoc < html.length; currentLoc++)
  {
    var currentVal = html.substring(currentLoc,currentLoc + 2 + objectType.length)
    if (currentVal.startsWith("<" + objectType))
      depth++;
    
    
    if (currentVal == "</" + objectType)
      depth--;
    
    if (depth == 0) break;
  }
  return currentLoc + "</>".length + objectType.length;
}


function LoadSetTableFromHTML_(bodyRootElement, online)
{
  var paperTable = SearchForClassID_(bodyRootElement, online ? "index-price-table-online" : "index-price-table-paper");
  var dictionary = [];
  
  var tableElement = paperTable.getChild("table");
  var rows = tableElement.getChild("tbody").getChildren("tr");
  for(var i = 0;i < rows.length;i++)
  {
    var columns = rows[i].getChildren("td");
    var nameFromTable = columns[0].getChild("a").getValue();
    var unparsedPrice = columns[3].getValue();
    var newPrice = Number(unparsedPrice.replace(/,/g, ''));
    dictionary.push({
      name:   nameFromTable,
      value: newPrice
    });
  }
  return dictionary;
}


/**
 * Parses HTML code that has characters in the form of &#XX; with the appropriate character.
 *
 * @param {string} str HTML code.
 * @return HTML code with escaped characters replaced.
 * @customfunction
 */
function parseHtmlEntities_(str) {
    return str.replace(/&#([0-9]{1,3});/gi, function(match, numStr) {
        var num = parseInt(numStr, 10); // read num as normal number
        return String.fromCharCode(num);
    });
}

/**
 * Get a list of sets in which the specified card was printed. Card information provided by Magicthegathering.io
 *
 * @param {string} name The name of the MTG card.
 * @return List of set codes of sets that the MTG card was printed in.
 * @customfunction
 */
function MTGSETLIST(name)
{
  var cardData = GetCardData_(name);
  return cardData.printings;
}

/**
 * Get the price of a MTG card from MTGGoldfish.com index. Card information provided by Magicthegathering.io
 *
 * @param {string} name The name of the MTG card.
 * @param {Boolean} foil [Optional] True if the price sought is for a foil version of the card. Promos are not considered foil in price tables.
 * @param {Boolean} online [Optional] True if the price sought is MTGO price. If false paper price will be found. 
 * @param {string} setCode Set of the card from which to pull the price.
 * @return The lowest possible price of the card  across all printings unless set is forced.
 * @customfunction
 */
function MTGCARDPRICE(name, foil, online, setCode)
{
  if(foil != null && foil){
    setCode += "_F";
  }
  var table = GetSetTable_(setCode, online);
  if(table == null)
  {
    return null;
  }
  
  for(var j = 0;j < table.length;j++)
  {
    if(parseHtmlEntities_(table[j].name) == name)
    {
      return table[j].value;
    }
  }
}
/**
 * Get the lowest price of a MTG card from MTGGoldfish.com index. Card information provided by Magicthegathering.io
 *
 * @param {string} name The name of the MTG card.
 * @param {Boolean} foil [Optional] True if the price sought is for a foil version of the card. Promos are not considered foil in price tables.
 * @param {Boolean} online [Optional] True if the price sought is MTGO price. If false paper price will be found. 
 * @param {string} forcedSet [Optional] Find only the price from the set specified (instead of searching for lowest price).
 * @return The lowest possible price of the card  across all printings unless set is forced.
 * @customfunction
 */
function MTGLOWESTCARDPRICE(name, foil, online, forcedSet){
  name = name||"Ravager Wurm";
  //foil = true;
  //online = true;
  var minPrice = null;
  if(forcedSet != null && forcedSet != ""){
    return MTGCARDPRICE(name, foil, online, forcedSet);
  }
  var cardSets = MTGSETLIST(name);
  for(var j = 0;j < cardSets.length;j++){
    var set = cardSets[j];
    if(set[0] != "p" && set[0] != "P" && set != "CED"){
      var newPrice = MTGCARDPRICE(name, foil, online, set);
      
      if(newPrice != null && (minPrice == null || newPrice < minPrice))
      {
        minPrice = newPrice;
      }
    }
  }
  return minPrice;
};
