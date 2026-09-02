// =========================================================
// KASATRIA 3D PEOPLE DATA VISUALIZATION
// =========================================================


// =========================================================
// CONFIGURATION
// =========================================================

const CONFIG = {

    CLIENT_ID:
        "402741316973-5ebqvn6rme8e0793qb74k4h4von1a1qi.apps.googleusercontent.com",

    SHEET_ID:
        "1yMBROAsyBQYAgv94-NydIkpskTJricm0nZfXa43wZ1I",

    RANGE:
        "A:F",

    SHEETS_API:
        "https://sheets.googleapis.com/v4/spreadsheets/",

    ANIMATION_DURATION:
        1200

};


// =========================================================
// THREE.JS IMPORTS
// =========================================================

import * as THREE from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {
    TrackballControls
} from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/TrackballControls.js";

import {
    CSS3DRenderer,
    CSS3DObject
} from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/renderers/CSS3DRenderer.js";


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let scene;

let camera;

let renderer;

let controls;

let people = [];

let objects = [];

let targets = {

    table: [],
    sphere: [],
    helix: [],
    grid: []

};

let animationFrame;

let currentLayout =
    "table";

let googleTokenClient;

let accessToken = null;


// =========================================================
// DOM
// =========================================================

const loginSection =
    document.getElementById(
        "login-section"
    );

const app =
    document.getElementById(
        "app"
    );

const container =
    document.getElementById(
        "container"
    );

const statusElement =
    document.getElementById(
        "status"
    );


// =========================================================
// START
// =========================================================

window.addEventListener(
    "load",
    () => {

        waitForGoogle();

        setupButtons();

    }
);


// =========================================================
// WAIT FOR GOOGLE
// =========================================================

function waitForGoogle() {

    if (
        window.google &&
        google.accounts &&
        google.accounts.oauth2
    ) {

        setupGoogleLogin();

    } else {

        setTimeout(
            waitForGoogle,
            300
        );

    }

}


// =========================================================
// GOOGLE LOGIN
// =========================================================

function setupGoogleLogin() {

    googleTokenClient =
        google.accounts.oauth2.initTokenClient({

            client_id:
                CONFIG.CLIENT_ID,

            scope:
                "https://www.googleapis.com/auth/spreadsheets.readonly",

            callback:
                async (response) => {

                    if (
                        response.error
                    ) {

                        console.error(
                            response
                        );

                        updateStatus(
                            "Google login failed."
                        );

                        return;

                    }

                    accessToken =
                        response.access_token;

                    await startApplication();

                }

        });


    // =====================================================
    // CREATE GOOGLE BUTTON
    // =====================================================

    const loginButton =
        document.createElement(
            "button"
        );


    loginButton.type =
        "button";


    loginButton.className =
        "google-signin-button";


    loginButton.innerHTML = `

        <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            class="google-logo"
        >

        <span>
            Sign in with Google
        </span>

    `;


    // =====================================================
    // BUTTON CLICK
    // =====================================================

    loginButton.addEventListener(
        "click",
        () => {

            googleTokenClient.requestAccessToken({

                prompt:
                    "consent"

            });

        }
    );


    const googleLogin =
        document.getElementById(
            "google-login"
        );


    if (
        googleLogin
    ) {

        googleLogin.innerHTML =
            "";

        googleLogin.appendChild(
            loginButton
        );

    }

}


// =========================================================
// START APPLICATION
// =========================================================

async function startApplication() {

    loginSection.style.display =
        "none";

    app.classList.add(
        "visible"
    );


    updateStatus(
        "Loading Google Sheet..."
    );


    try {

        people =
            await loadGoogleSheet();


        if (
            !people.length
        ) {

            throw new Error(
                "No people found in Google Sheet."
            );

        }


        updateStatus(
            `${people.length} people loaded`
        );


        initThree();

        createPeople();

        createLayouts();

        setupButtons();

        switchLayout(
            "table"
        );


    } catch (error) {

        console.error(
            error
        );


        updateStatus(
            "Failed to load Google Sheet."
        );


        alert(
            "Unable to load Google Sheet data.\n\n" +
            error.message
        );

    }

}


// =========================================================
// LOAD GOOGLE SHEET
// =========================================================

async function loadGoogleSheet() {

    const url =
        CONFIG.SHEETS_API +
        CONFIG.SHEET_ID +
        "/values/" +
        encodeURIComponent(
            CONFIG.RANGE
        );


    const response =
        await fetch(
            url,
            {

                headers: {

                    Authorization:
                        `Bearer ${accessToken}`

                }

            }
        );


    if (
        !response.ok
    ) {

        const errorText =
            await response.text();


        throw new Error(
            `Google Sheets API error: ${response.status} ${errorText}`
        );

    }


    const data =
        await response.json();


    const rows =
        data.values || [];


    if (
        rows.length <= 1
    ) {

        return [];

    }


    const headers =
        rows[0].map(
            value =>
                String(value)
                    .trim()
                    .toLowerCase()
        );


    console.log(
        "Google Sheet headers:",
        headers
    );


    const result = [];


    for (
        let i = 1;
        i < rows.length;
        i++
    ) {

        const row =
            rows[i];


        const person = {

            name:
                getColumn(
                    row,
                    headers,
                    "name",
                    0
                ),

            photo:
                getColumn(
                    row,
                    headers,
                    "photo",
                    1
                ),

            age:
                getColumn(
                    row,
                    headers,
                    "age",
                    2
                ),

            country:
                getColumn(
                    row,
                    headers,
                    "country",
                    3
                ),

            interest:
                getColumn(
                    row,
                    headers,
                    "interest",
                    4
                ),

            netWorth:
                getColumn(
                    row,
                    headers,
                    "net worth",
                    5
                )

        };


        if (
            !person.name &&
            !person.photo &&
            !person.age &&
            !person.country &&
            !person.interest &&
            !person.netWorth
        ) {

            continue;

        }


        result.push(
            person
        );

    }


    return result;

}


// =========================================================
// GET COLUMN
// =========================================================

function getColumn(
    row,
    headers,
    name,
    fallbackIndex
) {

    const index =
        headers.indexOf(
            name
        );


    if (
        index !== -1
    ) {

        return String(
            row[index] || ""
        ).trim();

    }


    return String(
        row[fallbackIndex] || ""
    ).trim();

}


// =========================================================
// NET WORTH NUMBER
// =========================================================

function getNetWorthNumber(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return 0;

    }


    const text =
        String(value)
            .replace(
                /,/g,
                ""
            )
            .replace(
                /\$/g,
                ""
            )
            .trim();


    const upper =
        text.toUpperCase();


    if (
        upper.endsWith("M")
    ) {

        return (
            parseFloat(
                upper
            ) * 1000000
        ) || 0;

    }


    if (
        upper.endsWith("K")
    ) {

        return (
            parseFloat(
                upper
            ) * 1000
        ) || 0;

    }


    return (
        parseFloat(
            text
        )
    ) || 0;

}


// =========================================================
// NET WORTH CLASS
// =========================================================

function getNetWorthClass(
    value
) {

    const amount =
        getNetWorthNumber(
            value
        );


    if (
        amount < 100000
    ) {

        return "net-red";

    }


    if (
        amount <= 200000
    ) {

        return "net-orange";

    }


    return "net-green";

}


// =========================================================
// FORMAT MONEY
// =========================================================

function formatMoney(
    value
) {

    const amount =
        getNetWorthNumber(
            value
        );


    return new Intl.NumberFormat(
        "en-US",
        {

            style:
                "currency",

            currency:
                "USD",

            maximumFractionDigits:
                0

        }
    ).format(
        amount
    );

}


// =========================================================
// THREE.JS INITIALIZATION
// =========================================================

function initThree() {

    scene =
        new THREE.Scene();


    camera =
        new THREE.PerspectiveCamera(
            45,
            container.clientWidth /
                container.clientHeight,
            1,
            20000
        );


    camera.position.set(
        0,
        0,
        5200
    );


    renderer =
        new CSS3DRenderer();


    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );


    renderer.domElement.style.position =
        "absolute";


    renderer.domElement.style.top =
        "0";


    renderer.domElement.style.left =
        "0";


    container.appendChild(
        renderer.domElement
    );


    controls =
        new TrackballControls(
            camera,
            renderer.domElement
        );


    controls.rotateSpeed =
        1.1;


    controls.zoomSpeed =
        1.0;


    controls.panSpeed =
        0.4;


    controls.noZoom =
        false;


    controls.noPan =
        false;


    controls.staticMoving =
        false;


    controls.dynamicDampingFactor =
        0.08;


    controls.minDistance =
        1500;


    controls.maxDistance =
        10000;


    animate();

}


// =========================================================
// CREATE PEOPLE
// =========================================================

function createPeople() {

    people.forEach(
        (
            person,
            index
        ) => {

            const element =
                createPersonCard(
                    person,
                    index
                );


            const object =
                new CSS3DObject(
                    element
                );


            object.position.set(
                0,
                0,
                0
            );


            object.rotation.set(
                0,
                0,
                0
            );


            object.scale.set(
                1,
                1,
                1
            );


            scene.add(
                object
            );


            objects.push(
                object
            );

        }
    );

}


// =========================================================
// CREATE PERSON CARD
// =========================================================

function createPersonCard(
    person,
    index
) {

    const element =
        document.createElement(
            "div"
        );


    const netClass =
        getNetWorthClass(
            person.netWorth
        );


    element.className =
        `element ${netClass}`;


    const image =
        document.createElement(
            "img"
        );


    image.alt =
        person.name ||
        "Person";


    image.src =
        person.photo ||
        "";


    image.loading =
        "lazy";


    image.referrerPolicy =
        "no-referrer";


    image.addEventListener(
        "error",
        () => {

            image.classList.add(
                "image-error"
            );


            image.src =
                createPlaceholder(
                    person.name
                );

        }
    );


    element.appendChild(
        image
    );


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "element-content";


    const name =
        document.createElement(
            "div"
        );


    name.className =
        "element-name";


    name.textContent =
        person.name ||
        "Unknown";


    content.appendChild(
        name
    );


    const info =
        document.createElement(
            "div"
        );


    info.className =
        "element-info";


    info.appendChild(
        createInfoRow(
            "Age",
            person.age
        )
    );


    info.appendChild(
        createInfoRow(
            "Country",
            person.country
        )
    );


    info.appendChild(
        createInfoRow(
            "Interest",
            person.interest
        )
    );


    content.appendChild(
        info
    );


    const netWorth =
        document.createElement(
            "div"
        );


    netWorth.className =
        "net-worth";


    netWorth.textContent =
        formatMoney(
            person.netWorth
        );


    content.appendChild(
        netWorth
    );


    element.appendChild(
        content
    );


    return element;

}


// =========================================================
// INFO ROW
// =========================================================

function createInfoRow(
    label,
    value
) {

    const row =
        document.createElement(
            "div"
        );


    row.className =
        "info-row";


    const labelElement =
        document.createElement(
            "span"
        );


    labelElement.className =
        "info-label";


    labelElement.textContent =
        `${label}:`;


    const valueElement =
        document.createElement(
            "span"
        );


    valueElement.className =
        "info-value";


    valueElement.textContent =
        value ||
        "-";


    row.appendChild(
        labelElement
    );


    row.appendChild(
        valueElement
    );


    return row;

}


// =========================================================
// PLACEHOLDER
// =========================================================

function createPlaceholder(
    name
) {

    const text =
        encodeURIComponent(
            name || "No Image"
        );


    return (
        "https://placehold.co/400x250/151a22/ffffff" +
        `?text=${text}`
    );

}


// =========================================================
// CREATE ALL LAYOUTS
// =========================================================

function createLayouts() {

    createTableLayout();

    createSphereLayout();

    createHelixLayout();

    createGridLayout();

}


// =========================================================
// TABLE
// 20 × 10
// =========================================================

function createTableLayout() {

    targets.table =
        [];


    const columns =
        20;


    const rows =
        10;


    const columnSpacing =
        170;


    const rowSpacing =
        225;


    const totalWidth =
        (columns - 1) *
        columnSpacing;


    const totalHeight =
        (rows - 1) *
        rowSpacing;


    for (
        let i = 0;
        i < objects.length;
        i++
    ) {

        const column =
            i % columns;


        const row =
            Math.floor(
                i / columns
            );


        const x =
            column *
                columnSpacing -
            totalWidth / 2;


        const y =
            totalHeight / 2 -
            row *
                rowSpacing;


        targets.table.push({

            position:
                new THREE.Vector3(
                    x,
                    y,
                    0
                ),

            rotation:
                new THREE.Euler(
                    0,
                    0,
                    0
                )

        });

    }

}


// =========================================================
// SPHERE
// =========================================================

function createSphereLayout() {

    targets.sphere =
        [];


    const radius =
        1350;


    const count =
        objects.length;


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const phi =
            Math.acos(
                -1 +
                (2 * i) /
                count
            );


        const theta =
            Math.sqrt(
                count * Math.PI
            ) *
            phi;


        const x =
            radius *
            Math.cos(theta) *
            Math.sin(phi);


        const y =
            radius *
            Math.sin(theta) *
            Math.sin(phi);


        const z =
            radius *
            Math.cos(phi);


        const position =
            new THREE.Vector3(
                x,
                y,
                z
            );


        const dummy =
            new THREE.Object3D();


        dummy.position.copy(
            position
        );


        dummy.lookAt(
            0,
            0,
            0
        );


        // FIX MIRROR TEXT
        // Rotate the CSS3D card 180 degrees
        // so the text faces the correct direction.

        const rotation =
            new THREE.Euler(
                dummy.rotation.x,
                dummy.rotation.y + Math.PI,
                dummy.rotation.z
            );


        targets.sphere.push({

            position,

            rotation

        });

    }

}


// =========================================================
// DOUBLE HELIX
// =========================================================

function createHelixLayout() {

    targets.helix =
        [];


    const radius =
        950;


    const verticalSpacing =
        38;


    const angleStep =
        0.32;


    for (
        let i = 0;
        i < objects.length;
        i++
    ) {

        const strand =
            i % 2;


        const index =
            Math.floor(
                i / 2
            );


        const angle =
            index *
                angleStep +
            strand *
                Math.PI;


        const x =
            radius *
            Math.cos(
                angle
            );


        const y =
            (index -
                objects.length / 4) *
            verticalSpacing;


        const z =
            radius *
            Math.sin(
                angle
            );


        const position =
            new THREE.Vector3(
                x,
                y,
                z
            );


        const dummy =
            new THREE.Object3D();


        dummy.position.copy(
            position
        );


        dummy.lookAt(
            0,
            y,
            0
        );


        // FIX MIRROR TEXT
        // Rotate the CSS3D card 180 degrees
        // so the text faces the correct direction.

        const rotation =
            new THREE.Euler(
                dummy.rotation.x,
                dummy.rotation.y + Math.PI,
                dummy.rotation.z
            );


        targets.helix.push({

            position,

            rotation

        });

    }

}


// =========================================================
// GRID
// 5 × 4 × 10
// =========================================================

function createGridLayout() {

    targets.grid =
        [];


    const columns =
        5;


    const rows =
        4;


    const layers =
        10;


    const xSpacing =
        200;


    const ySpacing =
        240;


    const zSpacing =
        250;


    const totalWidth =
        (columns - 1) *
        xSpacing;


    const totalHeight =
        (rows - 1) *
        ySpacing;


    const totalDepth =
        (layers - 1) *
        zSpacing;


    for (
        let i = 0;
        i < objects.length;
        i++
    ) {

        const column =
            i % columns;


        const row =
            Math.floor(
                i / columns
            ) % rows;


        const layer =
            Math.floor(
                i /
                (columns * rows)
            );


        const x =
            column *
                xSpacing -
            totalWidth / 2;


        const y =
            totalHeight / 2 -
            row *
                ySpacing;


        const z =
            layer *
                zSpacing -
            totalDepth / 2;


        targets.grid.push({

            position:
                new THREE.Vector3(
                    x,
                    y,
                    z
                ),

            rotation:
                new THREE.Euler(
                    0,
                    0,
                    0
                )

        });

    }

}


// =========================================================
// SWITCH LAYOUT
// =========================================================

function switchLayout(
    layout
) {

    if (
        !targets[layout]
    ) {

        return;

    }


    currentLayout =
        layout;


    updateActiveButton(
        layout
    );


    const selectedTargets =
        targets[layout];


    if (
        animationFrame
    ) {

        cancelAnimationFrame(
            animationFrame
        );

    }


    const startTime =
        performance.now();


    const startPositions =
        objects.map(
            object =>
                object.position.clone()
        );


    const startQuaternions =
        objects.map(
            object =>
                object.quaternion.clone()
        );


    function animateTransition(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        const progress =
            Math.min(
                elapsed /
                CONFIG.ANIMATION_DURATION,
                1
            );


        const eased =
            1 -
            Math.pow(
                1 - progress,
                3
            );


        objects.forEach(
            (
                object,
                index
            ) => {

                const target =
                    selectedTargets[
                        index
                    ];


                if (
                    !target
                ) {

                    return;

                }


                object.position.lerpVectors(
                    startPositions[index],
                    target.position,
                    eased
                );


                const targetQuaternion =
                    new THREE.Quaternion()
                        .setFromEuler(
                            target.rotation
                        );


                object.quaternion.copy(
                    startQuaternions[index]
                );


                object.quaternion.slerp(
                    targetQuaternion,
                    eased
                );

            }
        );


        if (
            progress < 1
        ) {

            animationFrame =
                requestAnimationFrame(
                    animateTransition
                );

        }

    }


    animationFrame =
        requestAnimationFrame(
            animateTransition
        );


    resetCamera(
        layout
    );

}


// =========================================================
// CAMERA
// =========================================================

function resetCamera(
    layout
) {

    let z =
        5200;


    if (
        layout === "table"
    ) {

        z =
            5600;

    }


    if (
        layout === "sphere"
    ) {

        z =
            3900;

    }


    if (
        layout === "helix"
    ) {

        z =
            4200;

    }


    if (
        layout === "grid"
    ) {

        z =
            5000;

    }


    camera.position.set(
        0,
        0,
        z
    );


    camera.lookAt(
        0,
        0,
        0
    );


    controls.target.set(
        0,
        0,
        0
    );


    controls.update();

}


// =========================================================
// BUTTONS
// =========================================================

function setupButtons() {

    const tableButton =
        document.getElementById(
            "table"
        );


    const sphereButton =
        document.getElementById(
            "sphere"
        );


    const helixButton =
        document.getElementById(
            "helix"
        );


    const gridButton =
        document.getElementById(
            "grid"
        );


    if (
        !tableButton ||
        !sphereButton ||
        !helixButton ||
        !gridButton
    ) {

        return;

    }


    if (
        tableButton.dataset.ready
    ) {

        return;

    }


    tableButton.dataset.ready =
        "true";


    tableButton.addEventListener(
        "click",
        () => {

            switchLayout(
                "table"
            );

        }
    );


    sphereButton.addEventListener(
        "click",
        () => {

            switchLayout(
                "sphere"
            );

        }
    );


    helixButton.addEventListener(
        "click",
        () => {

            switchLayout(
                "helix"
            );

        }
    );


    gridButton.addEventListener(
        "click",
        () => {

            switchLayout(
                "grid"
            );

        }
    );

}


// =========================================================
// ACTIVE BUTTON
// =========================================================

function updateActiveButton(
    layout
) {

    document
        .querySelectorAll(
            ".control-button"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );

            }
        );


    const button =
        document.getElementById(
            layout
        );


    if (
        button
    ) {

        button.classList.add(
            "active"
        );

    }

}


// =========================================================
// STATUS
// =========================================================

function updateStatus(
    message
) {

    if (
        statusElement
    ) {

        statusElement.textContent =
            message;

    }

}


// =========================================================
// ANIMATION
// =========================================================

function animate() {

    requestAnimationFrame(
        animate
    );


    if (
        controls
    ) {

        controls.update();

    }


    if (
        renderer &&
        scene &&
        camera
    ) {

        renderer.render(
            scene,
            camera
        );

    }

}


// =========================================================
// RESIZE
// =========================================================

window.addEventListener(
    "resize",
    () => {

        if (
            !camera ||
            !renderer
        ) {

            return;

        }


        const width =
            container.clientWidth;


        const height =
            container.clientHeight;


        camera.aspect =
            width /
            height;


        camera.updateProjectionMatrix();


        renderer.setSize(
            width,
            height
        );


        if (
            controls
        ) {

            controls.handleResize();

        }

    }
);
