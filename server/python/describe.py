import ast
import os
import json

OPENAI_TYPES = {
    'str': 'string',
    'int': 'integer',
}


def extract_function_signature_from_file(file_path):
    with open(file_path, 'r') as source:
        name = file_path.split("/")[2].replace('.', '-')
        source_content = source.read()
        node = ast.parse(source_content)

        classes = {cls.name: cls for cls in node.body if isinstance(
            cls, ast.ClassDef)}
        functions = [f for f in node.body if isinstance(f, ast.FunctionDef)]

        properties = {}
        required = []
        function_descriptions = {}

        for _, class_node in classes.items():
            if class_node.name == 'SymphonyRequest':
                for n in class_node.body:
                    if isinstance(n, ast.AnnAssign):
                        if isinstance(n.target, ast.Name):
                            property_name = n.target.id
                            property_type = ast.get_source_segment(
                                source_content, n.annotation)

                            if 'Optional' in property_type:
                                property_type = property_type.replace(
                                    'Optional', '').replace('(', '').replace(')', '')
                            else:
                                required.append(property_name)

                            property_description = n.value.s if isinstance(
                                n.value, ast.Str) else 'No description provided'

                            properties[property_name] = {
                                'type': OPENAI_TYPES[property_type],
                                'description': property_description
                            }

        for function in functions:
            function_descriptions[function.name] = ast.get_docstring(function)

        return {
            'name': name,
            'description': function_descriptions['handler'],
            'parameters': {
                'type': 'object',
                'properties': properties
            },
            'required': required
        }


def get_all_python_files_in_directory(directory):
    return [os.path.join(directory, f) for f in os.listdir(directory) if f.endswith('.py')]


def main(directory):
    python_files = get_all_python_files_in_directory(directory)
    descriptions = []

    for python_file in python_files:
        description = extract_function_signature_from_file(
            python_file)

        descriptions.append(description)

    with open('./server/python/descriptions.json', 'w') as f:
        json.dump(descriptions, f, indent=4)


if __name__ == '__main__':
    directory = './functions'
    main(directory)
