from PIL import Image
import os

def generate_icons(input_path, output_dir):
    try:
        img = Image.open(input_path)
        print(f"Format: {img.format}")
        
        # If it's an ICO, it might have multiple sizes.
        # PIL's ICO handler usually loads the largest one or we can iterate?
        # Actually PIL opens one of them.
        # Let's try to find the largest size if possible, or just use what we got.
        
        # For ICO files, img.info might contain 'sizes'.
        if img.format == 'ICO':
            print(f"ICO sizes: {img.info.get('sizes')}")
            # We want the largest one.
            # PIL defaults to the largest one usually, but let's be sure.
            # Actually, simply opening it might be enough.
            # Let's check the size of the opened image.
            print(f"Opened size: {img.size}")
            
            # If the opened size is small but there are larger ones, we might need a trick.
            # But usually PIL picks the best one.
            
        # Ensure RGBA
        img = img.convert("RGBA")
        
        # Trim transparent borders if any, to maximize the logo
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            print(f"Cropped to content: {img.size}")
        
        # Now resize to target sizes
        sizes = [16, 48, 128]
        
        for size in sizes:
            # Create a new square canvas
            # But wait, if we want it to be "big", we should just resize the image to fill the square.
            # We assume the logo is roughly square.
            
            # Resize using LANCZOS for quality
            # We resize the image to fit within (size, size) maintaining aspect ratio
            
            # Calculate new dimensions
            ratio = min(size / img.width, size / img.height)
            new_w = int(img.width * ratio)
            new_h = int(img.height * ratio)
            
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Create canvas
            canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            
            # Center it
            x = (size - new_w) // 2
            y = (size - new_h) // 2
            canvas.paste(resized, (x, y))
            
            output_path = os.path.join(output_dir, f"icon{size}.png")
            canvas.save(output_path, "PNG")
            print(f"Saved {output_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_icons("extension/icons/logo_favicon.png", "extension/icons")
