const apiKey = "AIzaSyC4_ToUySpg0UxJ0gzkNm6pFpHKBjAz2OE";
const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
let colorSafe = "#00ff00";
let colorUnSafe = "#ff0000";
let links;
let isExtensionOn = true;

function validateLinks() {
  const links = [...document.querySelectorAll("[href]")];
  const malwareLinks = [];
  const safeLinks = []; //oness to return

  const entries = links.map((link) => {
    return {
      url: link.href,
    };
  });

  const requestData = {
    client: {
      clientId: "ID",
      clientVersion: "1.0.0",
    },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
      platformTypes: ["WINDOWS"],
      threatEntryTypes: ["URL"],
      threatEntries: entries,
    },
  };

  fetch(apiUrl, {
    method: "POST",
    body: JSON.stringify(requestData),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const affectedLinks = [];

      if (data.matches) {
        data.matches.forEach((match) => {
          affectedLinks.push(match.threat.url);
        });
      }
      const uniqeAffectedLinks = [...new Set(affectedLinks)];

      Observer.disconnect();
      //we really do not want to check if colors on your webpage has changed so we dissconnect Observer
      links.forEach((link) => {
        // is it better to serach through all links? or just to do it with querySelector method? idk
        if (uniqeAffectedLinks.includes(link.href)) {
          link.style.color = colorUnSafe;
          link.style.border = `1px solid ${colorUnSafe}`;
          link.style.backgroundColor = "black";
          malwareLinks.push(link);
        } else {
          link.style.color = colorSafe;
          safeLinks.push(link);
        }
      });
      Observer.observe(document.body, config);
      //and then we call him again to work, like nothing happend
    })
    .catch((error) => {
      console.error("Error occured:", error);
    });

  return {
    malware: malwareLinks,
    safe: safeLinks,
  };
}
//FIRST DOM UPDATE, SO THE FIRST TIME WHEN VALIDATELINKS() WILL BE CALLED
//expilicitlyu change DOM just to call .observe on our Observer Instance, so the first changes on links will apply after (1+5)s on our page
//also delaying things to initialize this Observer Instance and let him cook
setTimeout(() => {
  document.body.setAttribute("data-safeLink", "true");
}, 1000);

//wait for message from popup.js about color
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  colorUnSafe = request.unsafeColor;
  colorSafe = request.safeColor;
  isExtensionOn = request.isExtensionOn;

  Observer.disconnect();

  if (isExtensionOn) links = validateLinks();
  // console.log("validation");

  links?.malware.forEach((link) => {
    link.style.color = colorUnSafe;
    link.style.border = `1px solid ${colorUnSafe}`;
    link.style.backgroundColor = "black";
  });
  links?.safe.forEach((link) => {
    link.style.color = colorSafe;
  });

  Observer.observe(document.body, config);
});

//load colors from local storage
chrome.storage.local.get(["safeColor"]).then((result) => {
  colorSafe = result.safeColor;
});
chrome.storage.local.get(["unsafeColor"]).then((result) => {
  colorUnSafe = result.unsafeColor;
});
chrome.storage.local.get(["isExtensionOn"]).then((result) => {
  isExtensionOn = result.isExtensionOn;
});

//if local storage is changed by popup.js then load these colors
chrome.storage.onChanged.addListener((changes, namespace) => {
  chrome.storage.local.get(["safeColor"]).then((result) => {
    colorSafe = result.safeColor;
  });

  chrome.storage.local.get(["unsafeColor"]).then((result) => {
    colorUnSafe = result.unsafeColor;
  });

  chrome.storage.local.get(["isExtensionOn"]).then((result) => {
    isExtensionOn = result.isExtensionOn;
  });
});

//every DOM update handling
function handleDOMMutations(mutationsListCallBack, observer) {
  for (let mutation of mutationsListCallBack) {
    // console.log(
    //   (mutation.type === "childList" || mutation.type === "attributes") &&
    //     isExtensionOn
    // );

    if (
      (mutation.type === "childList" || mutation.type === "attributes") &&
      isExtensionOn
    ) {
      links = validateLinks();
    }
  }
}

const config = { childList: true, subtree: true, attributes: true };
const Observer = new MutationObserver(debounce(handleDOMMutations, 5000));
// to jest obiekt normalnie no nie wiec gdy handler w tej klasie zlapie ze jest zmiana w domie to wowczas wywola ta metode ktora podalismy w callbacku
// pewnie jakos this.callback() czy cos takiego no bo ta funkcja pewnie zostala wczensije zainicjalizowana jakims
//private callback

Observer.observe(document.body, config);

// czyli za kazdym razem gdy metoda observe cos wykryje, ten nasz obiekt jest zainicjalizowany z funkcja callback, wiec on wie ze wykona funkcje callback
// gdy cokolwiek sie zmieni i do tej funkcji automatycznie idzie mutationList ktore zwraca ten MutationObserver

// returnuje ten observer ta mutationList i automatycznie przekazuje ja do callback funkcji

function debounce(callBack, delay = 1000) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      callBack(...args);
    }, delay);
  };
}
