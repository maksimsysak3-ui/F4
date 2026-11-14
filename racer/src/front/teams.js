/*
 * The 2026 grid for the season mode and time trial: each team's colours, base, team principal and
 * its two drivers, with the look of each person for the low-poly characters (skin tone, hair style
 * and colour, facial hair). `livery` is the key of the team's car livery (car/livery.js). `logo` links the
 * team's official logo on Wikimedia (shown on a plate of `logoBg`).
 */
export const SKIN = { fair: '#f4d2b4', light: '#ebc29c', tan: '#d6a476', olive: '#c08d60', brown: '#9a6440', dark: '#6a4228' };
export const HAIR = { black: '#1b1714', darkBrown: '#3a2618', brown: '#5a3a22', lightBrown: '#7a5634', blond: '#c8a464', ginger: '#a8582a', grey: '#9a9894', white: '#dcdad4' };

const p = (name, skin, hair, hairCol, facial = 'none', extra = {}) => ({ name, skin: SKIN[skin], hair, hairCol: HAIR[hairCol], facial, ...extra });

export const TEAMS = [
  { id: 'mclaren', logo: 'https://upload.wikimedia.org/wikipedia/en/0/03/McLarenF1Team.png', logoBg: '#f4f4f6', name: 'McLaren', full: 'McLaren Formula 1 Team', livery: 'mclaren', colours: ['#ff8000', '#1b1b20', '#47c7fc'], base: 'Woking, United Kingdom', principal: p('Andrea Stella', 'light', 'short', 'grey', 'none', { glasses: true }),
    drivers: [p('Lando Norris', 'light', 'quiff', 'brown'), p('Oscar Piastri', 'light', 'short', 'darkBrown')] },
  { id: 'ferrari', logo: 'https://thumb.wikimedia.org/wikipedia/en/thumb/d/df/Scuderia_Ferrari_HP_logo_24.svg/500px-Scuderia_Ferrari_HP_logo_24.svg.png', logoBg: '#f4f4f6', name: 'Ferrari', full: 'Scuderia Ferrari HP', livery: 'ferrari', colours: ['#d40000', '#ffe800', '#141414'], base: 'Maranello, Italy', principal: p('Frédéric Vasseur', 'light', 'bald', 'grey', 'stubble', { glasses: true }),
    drivers: [p('Charles Leclerc', 'light', 'quiff', 'darkBrown'), p('Lewis Hamilton', 'dark', 'braids', 'black', 'beard')] },
  { id: 'redbull', logo: 'https://thumb.wikimedia.org/wikipedia/en/thumb/f/fa/Red_Bull_Racing_Logo_2026.svg/500px-Red_Bull_Racing_Logo_2026.svg.png', logoBg: '#f4f4f6', name: 'Red Bull Racing', full: 'Oracle Red Bull Racing', livery: 'redbull', colours: ['#1e2a5c', '#db0a40', '#ffc906'], base: 'Milton Keynes, United Kingdom', principal: p('Laurent Mekies', 'light', 'short', 'grey', 'stubble', { glasses: true }),
    drivers: [p('Max Verstappen', 'fair', 'short', 'lightBrown', 'stubble'), p('Isack Hadjar', 'tan', 'curly', 'black')] },
  { id: 'mercedes', logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Mercedes-AMG_Petronas_F1_Team_logo_%282026%29.svg/500px-Mercedes-AMG_Petronas_F1_Team_logo_%282026%29.svg.png', logoBg: '#f4f4f6', name: 'Mercedes', full: 'Mercedes-AMG Petronas F1 Team', livery: 'mercedes', colours: ['#141518', '#00d2be', '#c0c0c0'], base: 'Brackley, United Kingdom', principal: p('Toto Wolff', 'light', 'short', 'grey', 'stubble'),
    drivers: [p('George Russell', 'fair', 'short', 'darkBrown'), p('Kimi Antonelli', 'light', 'quiff', 'black')] },
  { id: 'aston', logo: 'https://upload.wikimedia.org/wikipedia/en/1/15/Aston_Martin_Aramco_2024_logo.png', logoBg: '#f4f4f6', name: 'Aston Martin', full: 'Aston Martin Aramco F1 Team', livery: 'aston', colours: ['#00594f', '#cedc00', '#ffffff'], base: 'Silverstone, United Kingdom', principal: p('Adrian Newey', 'fair', 'bald', 'grey', 'none'),
    drivers: [p('Fernando Alonso', 'tan', 'short', 'black', 'stubble'), p('Lance Stroll', 'fair', 'short', 'brown')] },
  { id: 'williams', logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Atlassian_Williams_F1_Team_logo.svg/500px-Atlassian_Williams_F1_Team_logo.svg.png', logoBg: '#f4f4f6', name: 'Williams', full: 'Atlassian Williams Racing', livery: 'williams', colours: ['#0a1f6a', '#00a0de', '#ffffff'], base: 'Grove, United Kingdom', principal: p('James Vowles', 'fair', 'short', 'brown', 'beard', { glasses: true }),
    drivers: [p('Alex Albon', 'tan', 'short', 'black'), p('Carlos Sainz', 'olive', 'quiff', 'black', 'stubble')] },
  { id: 'racingbulls', logo: 'https://thumb.wikimedia.org/wikipedia/en/thumb/2/2b/VCARB_F1_logo.svg/500px-VCARB_F1_logo.svg.png', logoBg: '#f4f4f6', name: 'Racing Bulls', full: 'Visa Cash App Racing Bulls', livery: 'racingbulls', colours: ['#f4f4f6', '#1c3fd0', '#e5112b'], base: 'Faenza, Italy', principal: p('Alan Permane', 'fair', 'short', 'grey', 'none'),
    drivers: [p('Liam Lawson', 'fair', 'short', 'brown'), p('Arvid Lindblad', 'tan', 'short', 'black')] },
  { id: 'alpine', logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/BWT_Alpine_F1_Team_Logo.png/500px-BWT_Alpine_F1_Team_Logo.png', logoBg: '#0b1f4a', name: 'Alpine', full: 'BWT Alpine F1 Team', livery: 'alpine', colours: ['#0b5fd8', '#ff87bc', '#ffffff'], base: 'Enstone, United Kingdom', principal: p('Flavio Briatore', 'tan', 'short', 'white', 'none'),
    drivers: [p('Pierre Gasly', 'light', 'short', 'darkBrown', 'stubble'), p('Franco Colapinto', 'light', 'quiff', 'darkBrown')] },
  { id: 'haas', logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/TGR_Haas_F1_Team_Logo_%282026%29.svg/500px-TGR_Haas_F1_Team_Logo_%282026%29.svg.png', logoBg: '#f4f4f6', name: 'Haas', full: 'MoneyGram Haas F1 Team', livery: 'haas', colours: ['#f2f2f2', '#e10600', '#16161a'], base: 'Kannapolis, United States', principal: p('Ayao Komatsu', 'light', 'short', 'black', 'none', { glasses: true }),
    drivers: [p('Esteban Ocon', 'fair', 'short', 'brown'), p('Oliver Bearman', 'fair', 'quiff', 'lightBrown')] },
  { id: 'audi', logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Audif1.com_logo17_%28cropped%29.svg/500px-Audif1.com_logo17_%28cropped%29.svg.png', logoBg: '#f4f4f6', name: 'Audi', full: 'Audi F1 Team', livery: 'audi', colours: ['#b9bcc2', '#bb0a30', '#1a1a1a'], base: 'Hinwil, Switzerland', principal: p('Jonathan Wheatley', 'fair', 'bald', 'grey', 'beard'),
    drivers: [p('Nico Hülkenberg', 'fair', 'short', 'blond'), p('Gabriel Bortoleto', 'light', 'short', 'darkBrown')] },
  { id: 'cadillac', logo: 'https://thumb.wikimedia.org/wikipedia/en/thumb/b/bc/Cadillac_Formula_1_Team_Logo_%282025%29.svg/500px-Cadillac_Formula_1_Team_Logo_%282025%29.svg.png', logoBg: '#f4f4f6', name: 'Cadillac', full: 'Cadillac Formula 1 Team', livery: 'cadillac', colours: ['#f2f2f2', '#1a1a1a', '#c8a85a'], base: 'Fishers, United States', principal: p('Graeme Lowdon', 'fair', 'short', 'grey', 'none'),
    drivers: [p('Sergio Pérez', 'olive', 'short', 'black', 'stubble'), p('Valtteri Bottas', 'fair', 'mullet', 'blond', 'moustache')] },
];
