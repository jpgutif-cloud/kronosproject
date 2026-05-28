# KRONOS Generated Pixel Assets

These sheets were generated from the attached isometric office reference and copied into this project for Phaser.js prototyping.

## Folders

- `source/`: original chroma-key generations.
- `alpha/`: processed PNGs with transparent backgrounds.
- `crops/`: auto-cropped individual PNG sprites extracted from the alpha sheets.
- `asset-manifest.json`: contents and intended slicing notes.

## Sheets

- `kitchen_espresso_fridge_sheet.png`: espresso machine, cabinet, refrigerator, 3 lighting variants.
- `lounge_sofas_table_sheet.png`: long sofa, short sofa, coffee table, 3 lighting rows.
- `office_workstations_sheet.png`: four desk orientations.
- `seating_states_sheet.png`: office chair and bar stool states.
- `ping_pong_sheet.png`: table, paddles, ball.
- `characters_animation_sheet.png`: ARLO, Rex, Zara, Pip pose prototype sheet.
- `architecture_props_sheet.png`: room walls, floors, partition, and small props.

## Phaser Notes

Use the files in `alpha/` for atlas work, or the files in `crops/` for quick Phaser placement. The image generator did not produce perfectly uniform frame dimensions, so treat these as master/prototype assets before final animation polish.

Example loader:

```js
this.load.image('officeWorkstationsSheet', 'sprites/generated/alpha/office_workstations_sheet.png');
this.load.image('charactersSheet', 'sprites/generated/alpha/characters_animation_sheet.png');
```

For final animation, crop character frames into individual PNGs or a normalized atlas with fixed frame boxes.
