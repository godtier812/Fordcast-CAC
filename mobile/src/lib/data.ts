import inventory from '../../assets/seed/crossings.json';
import observations from '../../assets/observations/halloween-2013.json';
export const crossings = inventory.features;
export type Crossing = (typeof crossings)[number];
export const history = observations;
