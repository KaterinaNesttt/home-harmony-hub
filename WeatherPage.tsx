// Updated WeatherPage.tsx to fix corrupted Unicode characters and display Ukrainian text properly

import React from 'react';

const WeatherPage = () => {
    return (
        <div>
            <h1>Погода в Україні</h1>
            <p>Сьогодні ясна погода з легким вітром.</p>
        </div>
    );
};

export default WeatherPage;