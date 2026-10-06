import { useId, type SVGProps } from 'react';

/** Renders the Retool brand logo. */
export function Retool(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                fill="currentColor"
                d="M0 2.2A2.2 2.2 0 0 1 2.2 0h8.6A2.2 2.2 0 0 1 13 2.2v1.7A1.1 1.1 0 0 1 11.9 5H1.1A1.1 1.1 0 0 1 0 3.9V2.2Zm0 6.9A1.1 1.1 0 0 1 1.1 8h20.7a2.2 2.2 0 0 1 2.2 2.2v5.7a1.1 1.1 0 0 1-1.1 1.1H2.2A2.2 2.2 0 0 1 0 14.8V9.1Zm11 12a1.1 1.1 0 0 1 1.1-1.1h10.8a1.1 1.1 0 0 1 1.1 1.1v.7a2.2 2.2 0 0 1-2.2 2.2h-8.6a2.2 2.2 0 0 1-2.2-2.2v-.7Z"
            />
        </svg>
    );
}

/** Renders the Reflex brand lettermark. */
export function Reflex(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} fill="none" viewBox="0 0 8.96 12" xmlns="http://www.w3.org/2000/svg">
            <path
                fill="currentColor"
                d="M0 11.6V0.400024H8.96V4.88002H6.72V2.64002H2.24V4.88002H6.72V7.12002H2.24V11.6H0ZM6.72 11.6V7.12002H8.96V11.6H6.72Z"
            />
        </svg>
    );
}

/** Renders the Appsmith brand logo. */
export function Appsmith(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} fill="none" viewBox="0 0 552 552" xmlns="http://www.w3.org/2000/svg">
            {/* Orange offset frame. */}
            <rect x="56" y="58" width="482" height="481" fill="#FF6D2D" />

            {/* Main white tile. */}
            <rect x="18" y="20" width="475" height="475" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="6" />

            {/* Appsmith lettermark. */}
            <path
                fill="#1A1A1A"
                transform="translate(86 85) scale(2.25)"
                d="M52.81 102.78C51.95 101.253 51.2833 98.2533 50.81 93.78C45.85 100.94 37.9333 104.517 27.06 104.51C18.9467 104.51 12.4833 102.557 7.67001 98.65C2.85668 94.7433 0.450012 89.3033 0.450012 82.33C0.450012 68.8833 9.89335 61.2167 28.78 59.33L39.94 58.33C43.66 57.86 46.33 56.97 47.94 55.69C48.7694 54.9797 49.421 54.0853 49.843 53.0782C50.2649 52.0711 50.4454 50.9793 50.37 49.89C50.37 46.7433 49.3467 44.43 47.3 42.95C45.2534 41.47 41.7933 40.73 36.92 40.73C31.68 40.73 27.9134 41.6133 25.62 43.38C23.33 45.15 21.99 48.17 21.62 52.47H3.87002C4.91668 35.6833 15.9833 27.2867 37.07 27.28C57.5833 27.28 67.8367 34.6733 67.83 49.46V88.81C67.83 95.3033 68.83 99.97 70.83 102.81L52.81 102.78ZM45.08 87C48.6134 83.9 50.3767 79.44 50.37 73.62V66.9C48.66 68.43 45.84 69.43 41.93 69.9L32.2 71C27.4 71.58 24 72.7033 22 74.37C20.9609 75.2535 20.1416 76.3668 19.607 77.6216C19.0725 78.8765 18.8372 80.2385 18.92 81.6C18.8401 82.9965 19.0868 84.3924 19.6405 85.677C20.1943 86.9615 21.0398 88.0993 22.11 89C24.2633 90.76 27.34 91.64 31.34 91.64C36.9733 91.62 41.5534 90.0733 45.08 87Z"
            />

            {/* Underscore. */}
            <rect x="267" y="337" width="155" height="31" fill="#1A1A1A" />
        </svg>
    );
}

/** Renders the Superblocks brand logo. */
export function Superblocks(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} fill="none" viewBox="0 0 78 78" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(-29 0)">
                <path
                    fill="#131416"
                    d="M29 20.8C29 13.5194 29 9.87897 30.4169 7.09812C31.6633 4.65202 33.652 2.66327 36.0981 1.41691C38.879 0 42.5194 0 49.8 0H86.2C93.4807 0 97.121 0 99.9019 1.41691C102.348 2.66327 104.337 4.65202 105.583 7.09812C107 9.87897 107 13.5194 107 20.8V57.2C107 64.4807 107 68.121 105.583 70.9019C104.337 73.348 102.348 75.3367 99.9019 76.5831C97.121 78 93.4807 78 86.2 78H49.8C42.5194 78 38.879 78 36.0981 76.5831C33.652 75.3367 31.6633 73.348 30.4169 70.9019C29 68.121 29 64.4807 29 57.2V20.8Z"
                />
                <path
                    fill="#fff"
                    d="M86.4904 14.322C78.6605 15.007 72.826 21.7799 73.2425 29.5687L80.7013 28.9161C81.1666 26.1707 83.4341 23.9761 86.3376 23.7221C89.7873 23.4203 92.8285 25.9721 93.1303 29.4218C93.3895 32.3849 91.5434 35.0466 88.8313 35.9298L89.3394 41.7369L89.4376 41.7946C91.0564 41.653 92.8543 40.5147 93.8566 39.6862C98.4124 35.9204 98.6731 30.6755 98.6616 29.3436C98.6601 29.1659 98.7938 29.0139 98.9708 28.9984L99.7309 28.9319C100.029 28.9058 100.247 28.6458 100.202 28.3501C100.01 27.099 99.3468 23.9075 97.3336 21.5379C97.1552 21.3279 97.2812 20.9902 97.5557 20.9662L98.6893 20.867C99.0905 20.8319 99.3026 20.3978 99.0572 20.0786C97.6708 18.2755 93.4397 13.714 86.4904 14.322Z"
                />
                <path
                    fill="#2A333D"
                    fillOpacity="0.12"
                    d="M80.6379 30.5148L87.4306 36.2146L88.9922 36.0779C87.2681 28.3612 83.3967 26.0774 83.3967 26.0774C83.8262 24.9908 86.3377 23.7221 86.3377 23.7221C82.888 24.0239 80.3361 27.0651 80.6379 30.5148Z"
                />
                <path
                    fill="#fff"
                    d="M47.729 46.2231L47.857 47.6095L47.2145 40.2663C44.2984 39.8064 41.9576 37.4118 41.6887 34.3381C41.3719 30.7172 44.0505 27.525 47.6715 27.2082C49.8245 27.0198 51.8259 27.8904 53.1614 29.3885L60.4516 28.7507C58.4472 22.3932 52.2396 18.0507 45.3239 18.6558C38.3746 19.2638 34.9999 24.4908 33.9476 26.5072C33.7613 26.8642 34.0457 27.2548 34.4468 27.2197L35.5804 27.1205C35.8549 27.0965 36.0377 27.4073 35.8984 27.645C34.3273 30.3282 34.228 33.5865 34.2569 34.8517C34.2638 35.1508 34.5235 35.369 34.8215 35.343L35.5816 35.2765C35.7586 35.261 35.9167 35.3875 35.946 35.5627C36.166 36.8763 37.3335 41.9963 42.474 44.9138C43.605 45.5557 46.1102 46.3647 47.729 46.2231Z"
                />
                <path
                    fill="#2A333D"
                    fillOpacity="0.12"
                    d="M54.8014 33.1906C55.1182 36.8116 52.4396 40.0038 48.8186 40.3206L47.1795 40.464C47.5553 32.173 51.1408 29.1065 51.1408 29.1065C50.4988 28.0616 47.6714 27.2079 47.6714 27.2079C51.2924 26.8911 54.4846 29.5697 54.8014 33.1906Z"
                />
                <path
                    fill="#fff"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M90.1798 40.5302C88.8791 31.0301 82.5585 23.5713 71.2856 22.9164C71.0036 22.9 70.8627 22.8918 70.762 22.8352C70.6717 22.7845 70.6029 22.7116 70.5575 22.6185C70.5069 22.5148 70.5069 22.3784 70.5069 22.1057V20.4303C70.5069 19.9833 69.996 19.7287 69.6391 19.9979L66.9954 21.9915C66.6385 22.2606 66.1276 22.006 66.1276 21.559V20.5417C66.1276 20.0756 65.5797 19.8265 65.2305 20.1352C64.413 20.858 63.5974 21.5829 62.7839 22.3102C62.0881 22.9323 61.7402 23.2434 61.4433 23.4632C61.0732 23.7372 61.019 23.7723 60.6181 23.9988C60.2965 24.1805 59.5563 24.5128 58.0761 25.1772C50.0583 28.7763 46.2973 36.1451 47.0113 44.307C48.2215 58.1393 56.6002 63.0425 70.2951 61.8444C82.1664 60.8058 92.1457 54.8893 90.1798 40.5302ZM61.786 39.5631C62.1898 41.312 61.3356 43.0026 59.8782 43.3391C58.4208 43.6755 56.912 42.5305 56.5082 40.7816C56.3919 40.2777 56.3799 39.7787 56.4568 39.3155C56.6992 39.4844 57.0095 39.554 57.3201 39.4823C57.903 39.3477 58.2665 38.766 58.1319 38.1831C58.0522 37.8379 57.8158 37.5696 57.5151 37.4362C57.7783 37.2317 58.0812 37.0829 58.416 37.0057C59.8735 36.6692 61.3823 37.8142 61.786 39.5631ZM81.6231 39.1472C83.0609 38.7349 83.8254 37.002 83.3307 35.2766C82.8359 33.5512 81.2693 32.4867 79.8314 32.899C79.4204 33.0168 79.0643 33.2427 78.777 33.5454C79.1075 33.6532 79.3804 33.9178 79.4835 34.2772C79.6484 34.8523 79.3158 35.4522 78.7407 35.6171C78.4764 35.6929 78.2068 35.6637 77.9767 35.5541C77.9596 35.9477 78.0061 36.3589 78.1238 36.7696C78.6186 38.495 80.1852 39.5595 81.6231 39.1472ZM66.2781 49.2756L65.566 41.1175C65.3 38.071 67.4211 35.332 70.4372 34.8271C73.4534 34.3222 76.3508 36.2211 77.0915 39.1882L79.075 47.1334C79.9944 50.8163 77.5794 54.5012 73.8356 55.128C70.0917 55.7547 66.6083 53.0571 66.2781 49.2756Z"
                />
                <path
                    fill="#fff"
                    fillOpacity="0.3"
                    d="M68.0998 50.5376C69.4965 51.6817 71.3629 52.2466 73.299 51.9225C75.235 51.5984 76.8157 50.4565 77.7637 48.9199C77.6009 51.1726 75.9227 53.1309 73.5673 53.5252C71.2118 53.9195 68.9874 52.6145 68.0998 50.5376Z"
                />
                <path
                    fill="#fff"
                    fillOpacity="0.2"
                    d="M66.1542 47.8556C67.2367 50.6567 70.1773 52.4452 73.299 51.9227C76.4206 51.4001 78.6184 48.7514 78.7297 45.7505L79.075 47.1335C79.9944 50.8164 77.5794 54.5013 73.8355 55.1281C70.0917 55.7548 66.6082 53.0572 66.2781 49.2757L66.1542 47.8556Z"
                />
            </g>
        </svg>
    );
}

/** Renders the Windmill brand logo. */
export function Windmill(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
            <polygon
                fill="#BCD4FC"
                points="134.78,14.22 114.31,48.21 101.33,69.75 158.22,69.75 177.97,36.95 191.67,14.22"
            />
            <polygon
                fill="#3B82F6"
                points="227.55,69.75 186.61,69.75 101.33,69.75 129.78,119.02 158.16,119.02 228.61,119.02 256,119.02"
            />
            <polygon
                fill="#3B82F6"
                points="136.93,132.47 116.46,167.93 73.82,241.78 130.71,241.78 144.9,217.2 180.13,156.18 193.82,132.46"
            />
            <polygon
                fill="#3B82F6"
                points="121.7,131.95 101.23,96.49 58.59,22.63 30.15,71.91 44.34,96.49 79.57,157.5 93.26,181.22"
            />
            <polygon
                fill="#BCD4FC"
                points="64.81,131.95 25.15,131.21 0,130.74 28.44,180.01 66.73,180.72 93.26,181.21"
            />
            <polygon
                fill="#BCD4FC"
                points="165.38,181.74 184.58,216.46 196.75,238.47 225.19,189.2 206.66,155.69 193.83,132.46"
            />
        </svg>
    );
}

/** Renders the FastAPI brand logo. */
export function FastAPI(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} preserveAspectRatio="xMidYMid" viewBox="0 0 256 256">
            <path
                d="M128 0C57.33 0 0 57.33 0 128s57.33 128 128 128 128-57.33 128-128S198.67 0 128 0Zm-6.67 230.605v-80.288H76.699l64.128-124.922v80.288h42.966L121.33 230.605Z"
                fill="#009688"
            />
        </svg>
    );
}

/** Renders the Lovable brand logo with instance-specific SVG references. */
export function Lovable(props: SVGProps<SVGSVGElement>) {
    // Keep mask, gradient, and filter references unique across logo instances.
    const id = useId();

    return (
        <svg {...props} viewBox="0 0 121 122" fill="none">
            <mask id={`${id}-mask`} width="121" height="122" x="0" y="0" maskUnits="userSpaceOnUse" mask-type="alpha">
                <path
                    fill={`url(#${id}-gradient)`}
                    fillRule="evenodd"
                    d="M36.069 0c19.92 0 36.068 16.155 36.068 36.084v13.713h12.004c19.92 0 36.069 16.156 36.069 36.084 0 19.928-16.149 36.083-36.069 36.083H0v-85.88C0 16.155 16.148 0 36.069 0Z"
                    clipRule="evenodd"
                />
            </mask>
            <g mask={`url(#${id}-mask)`}>
                <g filter={`url(#${id}-blue)`}>
                    <ellipse cx="52.738" cy="65.101" fill="#4B73FF" rx="81.373" ry="81.192" />
                </g>
                <g filter={`url(#${id}-pink)`}>
                    <ellipse cx="61.673" cy="20.547" fill="#FF66F4" rx="104.216" ry="81.192" />
                </g>
                <g filter={`url(#${id}-red)`}>
                    <ellipse cx="78.666" cy="5.268" fill="#FF0105" rx="81.373" ry="71.304" />
                </g>
                <g filter={`url(#${id}-orange)`}>
                    <ellipse cx="63.121" cy="20.527" fill="#FE7B02" rx="48.937" ry="48.829" />
                </g>
            </g>
            <defs>
                <filter
                    id={`${id}-blue`}
                    width="235.52"
                    height="235.159"
                    x="-65.022"
                    y="-52.478"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_572_319" stdDeviation="18.194" />
                </filter>
                <filter
                    id={`${id}-pink`}
                    width="281.208"
                    height="235.159"
                    x="-78.93"
                    y="-97.032"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_572_319" stdDeviation="18.194" />
                </filter>
                <filter
                    id={`${id}-red`}
                    width="235.52"
                    height="215.383"
                    x="-39.094"
                    y="-102.423"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_572_319" stdDeviation="18.194" />
                </filter>
                <filter
                    id={`${id}-orange`}
                    width="170.649"
                    height="170.432"
                    x="-22.204"
                    y="-64.688"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_572_319" stdDeviation="18.194" />
                </filter>
                <linearGradient
                    id={`${id}-gradient`}
                    x1="40.453"
                    x2="76.933"
                    y1="21.433"
                    y2="121.971"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset=".025" stopColor="#FF8E63" />
                    <stop offset=".56" stopColor="#FF7EB0" />
                    <stop offset=".95" stopColor="#4B73FF" />
                </linearGradient>
            </defs>
        </svg>
    );
}

/** Renders the Replit brand logo. */
export function Replit(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 20 24" fill="none">
            <path
                d="M0 1.5C0 0.671573 0.671573 0 1.5 0H8.5C9.32843 0 10 0.671573 10 1.5V8H1.5C0.671573 8 0 7.32843 0 6.5V1.5Z"
                fill="#F26207"
            />
            <path d="M10 8H18.5C19.3284 8 20 8.67157 20 9.5V14.5C20 15.3284 19.3284 16 18.5 16H10V8Z" fill="#F26207" />
            <path
                d="M0 17.5C0 16.6716 0.671573 16 1.5 16H10V22.5C10 23.3284 9.32843 24 8.5 24H1.5C0.671573 24 0 23.3284 0 22.5V17.5Z"
                fill="#F26207"
            />
        </svg>
    );
}

/** Renders the Microsoft brand logo. */
export function Microsoft(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 256 256" preserveAspectRatio="xMidYMid">
            <path fill="#F1511B" d="M121.666 121.666H0V0h121.666z" />
            <path fill="#80CC28" d="M256 121.666H134.335V0H256z" />
            <path fill="#00ADEF" d="M121.663 256.002H0V134.336h121.663z" />
            <path fill="#FBBC09" d="M256 256.002H134.335V134.336H256z" />
        </svg>
    );
}
