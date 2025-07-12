from flask import Blueprint
from .recognize import recognize_face
from .save_attendance import save_attendance

api_blueprint = Blueprint('api', __name__)
api_blueprint.route('/recognize', methods=['POST'])(recognize_face)
api_blueprint.route('/save-attendance', methods=['POST'])(save_attendance)
