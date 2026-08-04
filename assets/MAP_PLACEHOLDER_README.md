# Map Route Placeholder Image

## Required File
Place a map route image at: `/assets/map-route-placeholder.png`

## Specifications:
- **Dimensions:** 375x300px (or any width with 0.8 aspect ratio)
- **Format:** PNG
- **Content:** A map showing a route between two points with:
  - Green marker for pickup point
  - Red marker for dropoff point
  - Blue route line connecting them
  - Map background (streets, buildings)

## Temporary Solution:
Until you add a real map image, the component will show a gray placeholder.

## Where to Get:
1. Take a screenshot from Google Maps with directions
2. Use Mapbox Static API
3. Use Google Maps Static API
4. Create a simple graphic in design tools

## Example Static API URL (Google Maps):
```
https://maps.googleapis.com/maps/api/staticmap?
  size=375x300
  &markers=color:green|label:A|12.9352,77.6245
  &markers=color:red|label:B|12.9716,77.5946
  &path=color:0x0000ff|weight:5|12.9352,77.6245|12.9716,77.5946
  &key=YOUR_API_KEY
```

Save the result as `map-route-placeholder.png` in this directory.
