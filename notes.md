the original endpoint works like this

call GET baseurl/metadata 
get json structured like this:

``` 
{
   rows: 2,
   fps: 35,
   cols: 2,
   seconds: 30, (frames * fps?)
   chunks: the actual number of chunks
   frameCount: the actual number of frames
}
```

from this call N times where N goes from 0 to chunks
call get baseurl/frames/N
get json that looks like
```
[ //frames
    [ //rows
        [ //columns
            [ r, g, b ] //colors in column
        ]
    ]
]
```

based on this structure /frames/N gets a chunk containing frames.
a chunk can have multiple frames within it. 

impelmentation:


create /metadata route which returns the info from the first item
in the queue
    get queue
        get first item
            send metadata
            
assume there is only one chunk, which returns the frame data for the module
            
create frames/0 route which returns all of the frame data for the first module.


get queue
    get first item
        get full data for the first item
            for each frame decode the PNG
                generate a frame of row/col/color data for the PNG
                    send it all as a giant JSON 
                    
see if this works. too big?