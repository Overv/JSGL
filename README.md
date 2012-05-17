# JSGL

JSGL is a software OpenGL 1.1 implementation written in pure Javascript. It doesn't rely on environment specific facilities like the 2D canvas in HTML5, but it is included in the example to make the rendered image visible to the user.

It was originally developed for usage as official graphics API on [JSOS](https://github.com/charliesome/jsos).

## Instructions

To use JSGL, you will have to include `gl-matrix.js` and `jsgl.js` in your file in that order. Example for HTML:

	<script type="text/javascript" src="gl-matrix.js"></script>
	<script type="text/javascript" src="jsgl.js"></script>

Before you can start drawing, you will have to create a graphics context by calling `GL.Context` with the width and height of the frame buffer as parameters.

	var gl = new GL.Context( w, h );

You can then start using it by calling the functions that are currently available the same way as you would with a hardware implementation.

To draw the classic red, blue and green rectangle on a black background:

	gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
	gl.clear( GL.COLOR_BUFFER_BIT );

	gl.matrixMode( GL.MODELVIEW );
	gl.loadIdentity();

	gl.begin( GL.TRIANGLES );
		gl.color3f( 1.0, 0.0, 0.0 );
		gl.vertex3f( -0.5, -0.5, 0.0 );
		gl.color3f( 0.0, 0.0, 1.0 );
		gl.vertex3f( 0.0, 0.5, 0.0 );
		gl.color3f( 0.0, 1.0, 0.0 );
		gl.vertex3f( 0.5, -0.5, 0.0 );
	gl.end();

> <img src="http://puu.sh/v80M" />

The library will not provide you a way to display the contents of the frame buffer. You can retrieve the pixel data by calling `gl.readPixels` and draw or store them however you'd like.

With HTML5, you can display the pixel array on a canvas by drawing it as an image:

	var context = canvas.getContext( "2d" );
	var buf = context.createImageData( w, h );
	gl.readPixels( 0, 0, w, h, GL.RGBA, GL.BYTE, buf.data );
	context.putImageData( buf, 0, 0 );

The `w` and `h` here should be the same size as the frame buffer if you need to grab all pixels. Note that if you are intending to render an animation, you should re-use the same image.

## Reference

These functions are currently implemented:

### gl.enable(`capability`)
> Enables OpenGL capabilities.
>
> **capability**: Feature to enable

### gl.disable(`capability`)
> Disables OpenGL capabilities.
>
> **capability**: Feature to disable

### gl.getError()
> Returns any errors caused by the last function call.

### gl.clearColor(`r`, `g`, `b`, `a`)
> Sets the color buffer clear color.
>
> **r, g, b**: Color components
> **a**: Alpha component

### gl.clearDepth(`depth`)
> Sets the depth buffer clear color.
>
> **depth**: Depth value

### gl.clear(`mask`)
> Clears one or more buffers.
>
> **mask**: Bitfield of buffers to clear

### gl.begin(`mode`)
> Start specification of vertices belonging to a group of primitives.
>
> **mode**: Primitives to draw

### gl.end()
> Finish specification of vertices.

### gl.color4f(`r`, `g`, `b`, `a`)
> Set the current color.
>
> **r, g, b**: Color components
> **a**: Alpha component

### gl.color3f(`r`, `g`, `b`)
> Sets the current color with implicit alpha of 1.0.
>
> **r, g, b**: Color components

### gl.vertex3f(`x`, `y`, `z`)
> Specify a vertex.
>
> **x, y, z**: Coordinates of the vertex

### gl.matrixMode(`mode`)
> Specify which matrix to apply operations on.
>
> **mode**: Matrix to make current

### gl.loadIdentity()
> Replaces the current matrix with the identity matrix.

### gl.translatef(`x`, `y`, `z`)
> Multiplies the current matrix by a translation matrix.
>
> **x, y, z**: Coordinates to translate by

### gl.scalef(`x`, `y`, `z`)
> Multiplies the current matrix by a scale matrix.
>
> **x, y, z**: Factors to scale each axis by

### gl.rotatef(`angle`, `x`, `y`, `z`)
> Multiplies the current matrix by a rotation matrix.
>
> **angle**: Angle in radians to rotate by
> **x, y, z**: Axis to rotate around

### gl.perspective(`fovy`, `aspect`, `near`, `far`)
> Sets up a perspective projection matrix.
>
> **fovy**: Vertical field-of-view
> **aspect**: Aspect ratio (width / height)
> **near**: Near clipping plane
> **far**: Far clipping plane

### gl.lookat(`eyeX`, `eyeY`, `eyeZ`, `centerX`, `centerY`, `centerZ`, `upX`, `upY`, `upZ`)
> Defines a viewing transformation.
>
> **eye**: Eye positon
> **center**: Focus point
> **up**: Up direction

### gl.readPixels(`x`, `y`, `w`, `h`, `format`, `type`, `data`)
> Reads pixels from the color buffer and returns them as an array.
>
> **x, y**: Window coordinates of the area you want to capture.
> **w, h**: Size of the area you want to capture.
> **format**: Structure and content of the array that will be returned
> **type**: Type of values to return
> **data**: Reference to array-like object to store data in

These values are available for the parameters of these functions:

	// Begin modes
	GL.POINTS				= 0x0000;
	GL.LINES				= 0x0001;
	GL.TRIANGLES			= 0x0004;
	GL.QUADS				= 0x0007;

	// Errors
	GL.NO_ERROR				= 0x0000;
	GL.INVALID_ENUM			= 0x0500;
	GL.INVALID_VALUE		= 0x0501;
	GL.INVALID_OPERATION	= 0x0502;

	// Features
	GL.DEPTH_TEST			= 0x0B71;

	// Types
	GL.BYTE					= 0x1400;
	GL.FLOAT				= 0x1406;

	// Matrix modes
	GL.MODELVIEW			= 0x1700;
	GL.PROJECTION			= 0x1701;

	// Pixel formats
	GL.RGBA					= 0x1908;

	// Buffers
	GL.DEPTH_BUFFER_BIT		= 0x0100;
	GL.COLOR_BUFFER_BIT 	= 0x4000;

More functions and options may be available later.

## License

The library and the example are licensed under the MIT license:

	Copyright (c) 2012 Alexander Overvoorde

	Permission is hereby granted, free of charge, to any person obtaining
	a copy of this software and associated documentation files (the
	"Software"), to deal in the Software without restriction, including
	without limitation the rights to use, copy, modify, merge, publish,
	distribute, sublicense, and/or sell copies of the Software, and to
	permit persons to whom the Software is furnished to do so, subject to
	the following conditions:

	The above copyright notice and this permission notice shall be
	included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
	NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
	LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
	OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
	WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The library depends on the [gl-matrix](https://github.com/toji/gl-matrix) Javascript library for matrix and vector operations, which is licensed under the zlib license. It is included with this project in minified form.