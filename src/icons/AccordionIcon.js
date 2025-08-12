export default function AccordionIcon({status}) {
    return <>
        {
                                                status ? <svg
                                        
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            width="20"
                                            height={'20'}
                                            stroke="currentColor"
                                        >
                                            <path  strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg> 
                                            : <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        stroke="currentColor"
                        >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7" // This is now an up arrow
                        />
                        </svg>

                                            }
                       
    </>
}