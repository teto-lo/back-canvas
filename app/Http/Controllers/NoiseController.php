<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class NoiseController extends Controller
{
    /**
     * Base64エンコードされたPNGを保存
     */
    public function save(Request $request)
    {
        $request->validate([
            'image' => 'required|string',
            'filename' => 'nullable|string|max:255'
        ]);

        // "data:image/png;base64," を除去
        $image = $request->input('image');
        $image = str_replace('data:image/png;base64,', '', $image);
        $image = str_replace(' ', '+', $image);
        $imageData = base64_decode($image);

        // ファイル名生成
        $filename = $request->input('filename', 'noise_' . time() . '.png');
        if (!str_ends_with($filename, '.png')) {
            $filename .= '.png';
        }

        // public/noise ディレクトリに保存
        $path = 'noise/' . $filename;
        Storage::disk('public')->put($path, $imageData);

        return response()->json([
            'success' => true,
            'path' => Storage::url($path),
            'filename' => $filename
        ]);
    }
}