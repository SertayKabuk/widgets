let apikey = "";
let voice = "Brian";
let index, fieldData, currency, isPlaying = false;
let queue = [], playing = false;
let lastId = [], currentProgress = 0;




const getDonations = (amount = 100) => {
    return new Promise((resolve, reject) => {
        fetch(`https://eskarbonka.wosp.org.pl/{pageShortName}/stream`).then(resp => resp.json()).then((data) => {
            resolve(data);
        }).catch(() => {
          fetch(`https://jebaited.net/wosp/{pageShortName}`).then(resp => resp.json()).then((data) => {
            resolve(data);
        }).catch(() => {
            reject('Cannot get donation list');
          })
        });
    })
};


const playAlert = (name,amount) => {
    console.log("Playing", name);
    //get data from the 🤟 StreamElements 🤟 data injection

    const animation = '{highlightAnimation}';

// vanilla es6 query selection (can use libraries and frameworks too)
    const userNameContainer = document.querySelector('#username-container');
	const amountContainer = document.querySelector('#amount-container');
// change the inner html to animate it 🤪
    userNameContainer.innerHTML = stringToAnimatedHTML(name, animation);
	amountContainer.innerHTML = stringToAnimatedHTML(amount, animation);
    /**
     * return an html, with animation
     * @param s: the text
     * @param anim: the animation to use on the text
     * @returns {string}
     */
    function stringToAnimatedHTML(s, anim) {
        let stringAsArray = s.split('');
        stringAsArray = stringAsArray.map((letter) => {
            return `<span class="animated-letter ${anim}">${letter.replace(" ", "&nbsp;")}</span>`;
        });
        return stringAsArray.join('');

    }

};

const audio = new Audio('{audio}');


window.addEventListener('onWidgetLoad', function (obj) {
        fieldData = obj.detail.fieldData;
        audio.volume = (fieldData.audioVolume / 100);
        apikey = obj.detail.channel.apiToken;
        voice = fieldData.voice;
        console.log("Widget loaded");
        setTimeout(() => {
            getDonations(100).then((data) => {
                    console.log("Got first donations");
                    lastId = data.donations.map(donation => donation.id);
                    setInterval(() => {
                        console.log("Iterating");
                        getDonations().then((data) => {
                            console.log(`Got ${data.donations.length} donations`);
                            for (let i in data.donations) {
                                if (lastId.indexOf(data.donations[i].id) === -1) {
                                    console.log("Found new event");
                                    queue.push(data.donations[i]);
                                    lastId.push(data.donations[i].id);
                                }
                            }
                            //lastId = Math.max(ids);
                            playEvent();
                        }).catch(console.error);
                    }, 20000);

                }
            ).catch(console.error);

        }, 1000);
    }
);


function template(templateId, data) {
    return document.getElementById(templateId).innerHTML
        .replace(
            /{(\w*)}/g,
            function (m, key) {
                return data.hasOwnProperty(key) ? data[key] : "";
            }
        );
}

async function playEvent() {
    if (isPlaying) {
        console.log('Alert is still playing');
        return;
    }

    if (!queue.length) {
        console.log('queue is empty');
        return;
    }


    const event = queue.shift();
  	let amount = parseFloat(event.amount.replace(" ",""));
    if (!amount > 0 && 0) {
        playEvent();
        return;
    }
   
    isPlaying = true;
    
    console.log("amount", amount);
    if (isNaN(amount)) {
        amount = "darowiznę"
    } else if (amount % 1) {
        amount = amount.toLocaleString(fieldData.userLocale, {
            style: 'currency',
            currency: fieldData.currency
        });
    } else {
        amount = amount.toLocaleString(fieldData.userLocale, {
            minimumFractionDigits: 0,
            style: 'currency',
            currency: fieldData.currency
        });
    }
    let row = $(template("alert", {
        name: `<span id="username-container">${event.name}</span>`,
        amount: `<span id="amount-container">${amount}</span>`,
        currency: fieldData.currency,
        message: event.comment || fieldData.message
    }));
    $("body").append(row);
    console.log("Playing alert");
    playAlert(event.name,amount);
    await new Promise((resolve, reject) => {
        try {
            audio.play().catch(reject);
            audio.addEventListener('ended', () => resolve(), { once: true });
        }
        catch{
            reject();
        };
        
    });

    const message = fieldData.ttsMessage.replace("{name}", event.name).replace("{amount}", amount).replace("{currency}", fieldData.currency).replace("{comment}", event.comment || fieldData.message);
    if (message) {
        await playTTS(message);
    } else {
        await (() => new Promise((resolve) => setTimeout(resolve, fieldData.alertDuration * 1000)))();
    }
    $(row).removeClass(fieldData.animationIn).addClass(fieldData.animationOut);
    console.log('Alert is done playing');
    let save = $("#alert").detach();
    $("body").html(save);
    isPlaying = false;
    setTimeout(() => {
        playEvent();
    }, 1000);
    
}

window.addEventListener('onEventReceived', function (obj) {
    if (obj.detail.listener === "event:test") {
        if (obj.detail.event.listener === 'widget-button' && obj.detail.event.field === 'emulate') {
            let emulated = {
                "name": "StreamElements",
                "comment": "No siema!",
                "amount": Math.floor(Math.random() * 100).toString(),
                
            };
            queue.push(emulated);
            console.log(queue);
            playEvent();
        }
        return;
    }
});

const playTTS = async (text) => {
    return new Promise((resolve, reject) => {
        try {
            const url =  new URL("https://api.streamelements.com/kappa/v2/speech");
            url.searchParams.set("voice", voice);
            url.searchParams.set("text", text);
            url.searchParams.set("key", apikey);
            const audio = new Audio(url);
            audio.volume = fieldData.audioVolume / 100;
            audio.play()
            audio.addEventListener('ended', () => {
                audio.remove();
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}
