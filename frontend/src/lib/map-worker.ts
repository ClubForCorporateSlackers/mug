import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// Vite が依存をまとめると、地図の裏側の処理の場所がずれる。公開用のファイルを直接指定する。
setWorkerUrl(workerUrl);
