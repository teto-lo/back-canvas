<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NoiseController;

// Home Page
Route::get('/', function () {
    return view('home');
})->name('home');

// Noise Generator
Route::get('/noise', function () {
    return view('noise-generator');
})->name('noise');

Route::post('/noise/save', [NoiseController::class, 'save'])->name('noise.save');

// Watercolor Generator
Route::get('/watercolor', function () {
    return view('watercolor-generator');
})->name('watercolor');

// Aurora Generator
Route::get('/aurora', function () {
    return view('aurora-generator');
})->name('aurora');

Route::get('/geometric', function () {
    return view('geometric-generator');
})->name('geometric');

Route::get('/topography', function () {
    return view('topography-generator');
})->name('topography');

// Gradient Generator
Route::get('/gradient', function () {
    return view('gradient-generator');
})->name('gradient');

// Particle Generator
Route::get('/particle', function () {
    return view('particle-generator');
})->name('particle');

// Blob Generator
Route::get('/blob', function () {
    return view('blob-generator');
})->name('blob');

// Perlin Noise Generator
Route::get('/perlin', function () {
    return view('perlin-generator');
})->name('perlin');

// Voronoi Generator
Route::get('/voronoi', function () {
    return view('voronoi-generator');
})->name('voronoi');

Route::get('/wave', function () {
    return view('wave-generator');
})->name('wave');

// Wagara (Japanese Pattern) Generator
Route::get('/wagara', function () {
    return view('wagara-generator');
})->name('wagara');

// Tech (Circuit) Generator
Route::get('/tech', function () {
    return view('tech-generator');
})->name('tech');

// Memphis (Pop) Generator
Route::get('/memphis', function () {
    return view('memphis-generator');
})->name('memphis');

// Sunburst (Speed Lines) Generator
Route::get('/sunburst', function () {
    return view('sunburst-generator');
})->name('sunburst');

// Liquid (Marble) Generator
Route::get('/liquid', function () {
    return view('liquid-generator');
})->name('liquid');

// Frame (Transparent) Generator
Route::get('/frame', function () {
    return view('frame-generator');
})->name('frame');

// Soft Gradient Generator
Route::get('/soft-gradient', function () {
    return view('soft-gradient-generator');
})->name('soft-gradient');

