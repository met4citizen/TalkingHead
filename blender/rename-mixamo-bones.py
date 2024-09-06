import bpy

# Recursive traverse
def traverse(x):
    yield x
    if hasattr(x, 'children'):
        for c in x.children:
            yield from traverse(c)

# Has bones
def hasBones(x):
    return hasattr(x, 'data') and hasattr(x.data, 'bones')

# Remove mixamorig: prefix
for r in bpy.context.scene.objects:
    for o in traverse(r):
        if hasBones(o):
            for b in o.data.bones:
                b.name = b.name.replace( 'mixamorig:', '')
