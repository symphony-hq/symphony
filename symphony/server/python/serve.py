import os
import sys
from flask import Flask, request
import importlib
import importlib.util
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
import time
import logging

log = logging.getLogger('werkzeug')
logging.disable(logging.CRITICAL)

app = Flask(__name__)


def load_handlers():
    handlers = {}
    dir_path = os.path.dirname(os.path.realpath(__file__))
    functions_dir = os.path.join(dir_path, "../../../functions")

    for file in os.listdir(functions_dir):
        if file.endswith(".py"):
            module_name = file[:-3]
            spec = importlib.util.spec_from_file_location(
                module_name, os.path.join(functions_dir, file))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            handlers[module_name] = module.handler

    return handlers


@app.route('/<handler_name>', methods=['POST'])
def handle_request(handler_name):
    handlers = load_handlers()

    if handler_name in handlers:
        handler = handlers[handler_name]
        response = handler(request.json)
        return response.model_dump_json()
    else:
        return {"error": "Handler not found"}, 404


class MyHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if not event.src_path.endswith('.py'):
            return

        print("Python file changed: ", event.src_path)
        os.execv(sys.executable, ['python'] + sys.argv)


if __name__ == "__main__":
    event_handler = MyHandler()
    observer = Observer()
    observer.schedule(event_handler, path='../../../functions', recursive=True)
    observer_thread = threading.Thread(target=observer.start)
    observer_thread.start()

    try:
        app.run(port=3004)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()
