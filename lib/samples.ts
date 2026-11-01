// Recorded sample shoppers: real YouCam results, replayed with zero API calls.
import ananya from '@/data/samples/ananya.json';
import meera from '@/data/samples/meera.json';
import kavya from '@/data/samples/kavya.json';
import type { Look } from './look';

export const SAMPLES = [ananya, meera, kavya] as unknown as Look[];
export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id);
