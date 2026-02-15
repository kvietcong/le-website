// Global Variables //
/** Array of all stars on the canvas */
let stars = [];
/** Amount of updates per second */
const updatesPerSecond = 8;
/** Reference to the canvas that the starfield is drawn on */
const canvas = document.getElementById("starfield");
/** The canvas context for drawing */
const context = canvas.getContext("2d");
/** Stars per square pixel */
const starDensity = 1 / 20_000;
/** Flicker rate */
const flickerRate = 2;
/** Min Size Multiplier **/
const minSizeMultiplier = 0.6;
/** Max Size Multiplier **/
const maxSizeMultiplier = 6;
/** Size Multiplier Skew **/
const sizeMultiplierSkew = 3;

const bufferCanvas = document.createElement("canvas");
const bufferContext = bufferCanvas.getContext("2d");

const randomBinomial = (min, max, skew) => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random() //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random()
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)

    num = num / 10.0 + 0.5 // Translate to 0 -> 1
    if (num > 1 || num < 0) num = randomBinomial(min, max, skew) // resample between 0 and 1 if out of range
    else {
        num = Math.pow(num, skew) // Skew
        num *= max - min // Stretch to fill range
        num += min // offset to min
    }
    return num
}

const Star = {
    create: (
        x, y,
        radius, opacity,
        change,
        xMultiplier = randomBinomial(minSizeMultiplier, maxSizeMultiplier, sizeMultiplierSkew),
        yMultiplier = randomBinomial(minSizeMultiplier, maxSizeMultiplier, sizeMultiplierSkew),
    ) => ({
        x, y, radius, opacity, change,
        xMultiplier, yMultiplier
    }),
    draw: star => {
        bufferContext.beginPath(); {
            bufferContext.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            bufferContext.arc(star.x, star.y, star.radius * 3, 0, 360);

            if (star.radius > 0.3) {
                bufferContext.moveTo(star.x - star.radius, star.y);
                bufferContext.lineTo(star.x, star.y - star.radius * 15 * star.yMultiplier);
                bufferContext.lineTo(star.x + star.radius, star.y);

                bufferContext.moveTo(star.x, star.y - star.radius);
                bufferContext.lineTo(star.x + star.radius * 15 * star.xMultiplier, star.y);
                bufferContext.lineTo(star.x, star.y + star.radius);

                bufferContext.moveTo(star.x + star.radius, star.y);
                bufferContext.lineTo(star.x, star.y + star.radius * 15 * star.yMultiplier);
                bufferContext.lineTo(star.x - star.radius, star.y);

                bufferContext.moveTo(star.x, star.y + star.radius);
                bufferContext.lineTo(star.x - star.radius * 15 * star.xMultiplier, star.y);
                bufferContext.lineTo(star.x, star.y - star.radius);
            }
        } bufferContext.fill();


        bufferContext.beginPath(); {
            bufferContext.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.1})`;
            bufferContext.arc(star.x, star.y, star.radius * 10, 0, 360);
        } bufferContext.fill();

        return star;
    },
    update: star => {
        const factor = 1 / updatesPerSecond;
        const newStar = star;
        newStar.change *= (newStar.opacity >= 1 || newStar.opacity <= 0) ? -1 : 1;
        newStar.opacity += newStar.change * (Math.random() + 0.2) / 4 * flickerRate * factor;
        return newStar;
    },
    isInViewport: (star, rect, viewportWidth, viewportHeight) => {
        const starX = rect.left + star.x;
        const starY = rect.top + star.y;
        return starX >= 0 && starX <= viewportWidth && starY >= 0 && starY <= viewportHeight;
    },
};

/** General update function */
const update = () => {
    const rect = canvas.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    stars.forEach(star => {
        if (Star.isInViewport(star, rect, viewportWidth, viewportHeight)) {
            Star.update(star);
        }
    });
};

// Gives an array from min to max
const range = (min, max) => {
    let arr = [];
    for (let i = min; i <= max; i++) {
        arr.push(i);
    }
    return arr;
}

const backgroundCanvas = document.createElement("canvas");
const backgroundContext = backgroundCanvas.getContext("2d");

const chunk = 32;
const startHue = 215;
const endHue = 275;

const backgroundInit = () => {
    const blobs = [];
    const { width, height } = backgroundCanvas;

    const totalBlobs = Math.round(Math.sqrt(width * height) / 72);
    const rands = range(0, totalBlobs).map(_ => range(0, 3).map(__ => Math.random()));

    for (let i = 0; i < totalBlobs; i++) {
        const x = rands[i][0] * width;
        const y = rands[i][1] * height;
        const r = rands[i][2] * 1600 + 50 * (width * height / 50000000);
        const blob = { x, y, r };
        blobs.push(blob)
    }

    for (let x = 0; x < width; x += chunk) {
        for (let y = 0; y < height; y += chunk) {
            let sum = 0;
            for (const blob of blobs) {
                const xdif = x - blob.x;
                const ydif = y - blob.y;
                const distance = Math.sqrt((xdif * xdif) + (ydif * ydif));
                let factor = 2;
                if (distance < 1600) factor *= 1.5;
                sum += factor * blob.r / distance;
            }
            const ratio = Math.min(1, (sum / 150)) * 0.1;
            if (ratio < 0.04) continue;
            const hue = (startHue + (y / height) * (endHue - startHue));
            const fillStyle = `hsl(${hue}, 100%, ${ratio * 100}%)`
            backgroundContext.fillStyle = fillStyle;
            backgroundContext.fillRect(x, y, chunk, chunk);
        }
    }
}

const drawBackground = () => {
    const { filter } = bufferContext;
    bufferContext.filter = `blur(${chunk * 2}px)`;
    bufferContext.drawImage(backgroundCanvas, 0, 0);
    bufferContext.filter = filter;
}

const draw = () => {
    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;

    bufferContext.globalCompositeOperation = "lighten";
    bufferContext.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
    drawBackground();

    const rect = canvas.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    stars.forEach(star => {
        if (Star.isInViewport(star, rect, viewportWidth, viewportHeight)) {
            Star.draw(star);
        }
    });
    window.requestAnimationFrame(draw);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bufferCanvas, 0, 0);
}

/** Initializes a new set of stars */
const init = () => {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;

    backgroundCanvas.width = canvas.width;
    backgroundCanvas.height = canvas.height;
    backgroundInit();

    const starCount = Math.floor(canvas.width * canvas.height * starDensity);
    stars = [];

    for (let i = 0; i < starCount; i++) {
        const opacity = Math.random();
        // const radius = 3 * Math.random() * Math.random();
        const radius = randomBinomial(0.1, 1.5, 3.5);
        const x = Math.random() * canvas.offsetWidth;
        const y = Math.random() * canvas.offsetHeight;

        /** Randomized initial state if star starts glowing or fading */
        const change = Math.random() > .5 ? 1 : -1;

        const star = Star.create(x, y, radius, opacity, change);
        stars.push(star);
    }
    canvas.style.transform = 'translate(-4px, -4px)';
}

// Initializes stars and attaches proper listeners
window.addEventListener("load", init);
window.setInterval(update, 1000 / updatesPerSecond);
window.requestAnimationFrame(draw);
window.addEventListener("resize", init);
window.addEventListener("mousemove", event => {
    const x = event.clientX / window.innerWidth;
    const y = event.clientY / window.innerHeight;
    const moveX = x * 5;
    const moveY = y * 5;
    canvas.style.transform = `translate(-${moveX}px, -${moveY}px)`;
});

// All anchor links will be smooth scrolled to
document.querySelectorAll("a[href^='#']").forEach(anchor => {
    anchor.addEventListener("click", event => {
        event.preventDefault();
        document.querySelector(anchor.getAttribute("href")).scrollIntoView({
            behavior: "smooth"
        });
    });
});

window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    if (window.scrollY > 0) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});
